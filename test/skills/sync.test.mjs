import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { UPSTREAM, SNAPSHOT, fetchSnapshot, localMarkdownLinks, readSnapshot, syncSkills, validateSnapshot } from '../../scripts/sync-skills.mjs';

const revision = 'a'.repeat(40);
function sample() {
  const files = new Map([['LICENSE', Buffer.from('license\r\n')]]);
  for (const name of ['using-n8n-skills-official', 'n8n-workflow-lifecycle-official', 'n8n-debugging-official']) {
    files.set(`skills/${name}/SKILL.md`, Buffer.from(`---\nname: ${name}\ndescription: Example\n---\n`));
  }
  files.set('skills/n8n-debugging-official/references/example.json', Buffer.from('{"example":true}\r\n'));
  return files;
}
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'n8n-sync-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'shared-skills.lock.json'), JSON.stringify({ repository: UPSTREAM, commit: revision }));
  return root;
}

test('sync preserves upstream bytes, is idempotent, and leaves local skills alone', async t => {
  const root = await fixture(t);
  const local = path.join(root, 'skills/connect-n8n/SKILL.md');
  await mkdir(path.dirname(local), { recursive: true });
  await writeFile(local, 'Kiro connection');
  const files = sample();
  const options = { root, fetch: async commit => { assert.equal(commit, revision); return files; } };
  assert.equal((await syncSkills(options)).changed, files.size);
  assert.deepEqual(await readSnapshot(path.join(root, SNAPSHOT)), files);
  assert.equal((await syncSkills(options)).changed, 0);
  assert.equal((await syncSkills({ ...options, check: true })).changed, 0);
  assert.equal(await readFile(local, 'utf8'), 'Kiro connection');
});

test('check detects edited, missing and extra imported files without rewriting them', async t => {
  const root = await fixture(t);
  const options = { root, fetch: async () => sample() };
  await syncSkills(options);
  const destination = path.join(root, SNAPSHOT);
  await writeFile(path.join(destination, 'LICENSE'), 'edited');
  await rm(path.join(destination, 'skills/n8n-debugging-official/references/example.json'));
  await writeFile(path.join(destination, 'extra.txt'), 'extra');
  await assert.rejects(syncSkills({ ...options, check: true }), /Shared skills differ/);
  assert.equal(await readFile(path.join(destination, 'LICENSE'), 'utf8'), 'edited');
  await syncSkills(options);
  assert.deepEqual(await readSnapshot(destination), sample());
});

test('update removes obsolete upstream files and advances the lock together', async t => {
  const root = await fixture(t);
  const original = sample();
  original.set('NOTICE', Buffer.from('previous notice'));
  await syncSkills({ root, fetch: async () => original });
  const next = sample();
  next.set('skills/n8n-debugging-official/references/new.md', Buffer.from('new reference'));
  const commit = 'b'.repeat(40);
  await syncSkills({ root, commit, fetch: async requested => { assert.equal(requested, commit); return next; } });
  assert.equal(JSON.parse(await readFile(path.join(root, 'shared-skills.lock.json'))).commit, commit);
  assert.deepEqual(await readSnapshot(path.join(root, SNAPSHOT)), next);
});

test('failed fetch or invalid snapshot preserves the previous snapshot and lock', async t => {
  const root = await fixture(t);
  await syncSkills({ root, fetch: async () => sample() });
  const lock = await readFile(path.join(root, 'shared-skills.lock.json'));
  await assert.rejects(syncSkills({ root, commit: 'b'.repeat(40), fetch: async () => { throw new Error('offline'); } }), /offline/);
  const invalid = sample();
  invalid.delete('LICENSE');
  await assert.rejects(syncSkills({ root, commit: 'b'.repeat(40), fetch: async () => invalid }), /license/);
  assert.deepEqual(await readSnapshot(path.join(root, SNAPSHOT)), sample());
  assert.deepEqual(await readFile(path.join(root, 'shared-skills.lock.json')), lock);
});

test('rejects floating revisions, alternate repositories and update during check', async t => {
  const root = await fixture(t);
  const fetch = async () => { throw new Error('must not fetch'); };
  await assert.rejects(syncSkills({ root, commit: 'main', fetch }), /full, lowercase/);
  await assert.rejects(syncSkills({ root, check: true, commit: revision, fetch }), /cannot update/);
  await writeFile(path.join(root, 'shared-skills.lock.json'), JSON.stringify({ repository: 'https://example.com/other.git', commit: revision }));
  await assert.rejects(syncSkills({ root, fetch }), /Only n8n-io\/skills/);
});

test('failed lock replacement rolls back the snapshot and preserves the old pin', async t => {
  const root = await fixture(t);
  await syncSkills({ root, fetch: async () => sample() });
  const lockPath = path.join(root, 'shared-skills.lock.json');
  const before = await readFile(lockPath);
  const changed = sample();
  changed.set('LICENSE', Buffer.from('new license'));
  await assert.rejects(syncSkills({
    root, commit: 'b'.repeat(40), fetch: async () => changed,
    renameFile: async (from, to) => {
      if (to === lockPath) throw new Error('lock replacement failed');
      await rename(from, to);
    },
  }), /lock replacement failed/);
  assert.deepEqual(await readSnapshot(path.join(root, SNAPSHOT)), sample());
  assert.deepEqual(await readFile(lockPath), before);
});

test('linked lock files are rejected before fetching or overwriting the target', async t => {
  const root = await fixture(t);
  const lockPath = path.join(root, 'shared-skills.lock.json');
  const target = path.join(root, 'original-lock.json');
  await rename(lockPath, target);
  await symlink(target, lockPath, 'file');
  const before = await readFile(target);
  await assert.rejects(syncSkills({ root, commit: 'b'.repeat(40), fetch: async () => { throw new Error('must not fetch'); } }), /ordinary file/);
  assert.deepEqual(await readFile(target), before);
});

test('a revision with identical content reports zero changes for the updater', async t => {
  const root = await fixture(t);
  await syncSkills({ root, fetch: async () => sample() });
  const result = await syncSkills({ root, commit: 'b'.repeat(40), fetch: async () => sample() });
  assert.equal(result.changed, 0);
  assert.deepEqual(await readSnapshot(path.join(root, SNAPSHOT)), sample());
});

test('validation checks routed skills and local references, excluding Markdown examples', () => {
  const files = sample();
  const file = 'skills/n8n-debugging-official/SKILL.md';
  const original = files.get(file);
  files.set(file, Buffer.concat([original, Buffer.from('\n[Example](references/example.json)\n`[title](url)`\n')]));
  assert.equal(validateSnapshot(files), 3);
  files.set(file, Buffer.concat([original, Buffer.from('\nRead n8n-missing-official.\n')]));
  assert.throws(() => validateSnapshot(files), /missing skill/);
  files.set(file, Buffer.concat([original, Buffer.from('\n[Missing](references/missing.md)\n')]));
  assert.throws(() => validateSnapshot(files), /missing file/);
  assert.deepEqual(localMarkdownLinks('[yes](real.md#part) `![alt](url)`\n```md\n[example](url)\n```\n[external](https://example.com)\n[anchor](#part)'), ['real.md']);
});

test('fetch reads the exact commit as Git blobs and excludes non-skill runtime files', async t => {
  const root = await fixture(t);
  const git = async (...args) => (await promisify(execFile)('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=false', ...args], { cwd: root })).stdout.trim();
  await git('init', '--quiet');
  await git('config', 'core.autocrlf', 'false');
  for (const [file, bytes] of sample()) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), bytes);
  }
  await writeFile(path.join(root, 'package.json'), '{"scripts":{"install":"do not execute"}}');
  await git('add', '.');
  await git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '--quiet', '-m', 'fixture');
  const commit = await git('rev-parse', 'HEAD');
  await writeFile(path.join(root, 'LICENSE'), 'uncommitted change');
  assert.deepEqual(await fetchSnapshot(commit, root), sample());
  await git('update-index', '--chmod=+x', 'skills/n8n-debugging-official/references/example.json');
  await git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '--quiet', '-m', 'executable fixture');
  await assert.rejects(fetchSnapshot(await git('rev-parse', 'HEAD'), root), /Executable or linked/);
});
