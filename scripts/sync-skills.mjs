import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';

export const UPSTREAM = 'https://github.com/n8n-io/skills.git';
export const SNAPSHOT = 'skills/connect-n8n/references/n8n-skills';
const LOCK = 'shared-skills.lock.json';
const exec = promisify(execFile);

function validateCommit(commit) {
  assert.match(commit, /^[a-f0-9]{40}$/, 'Use a full, lowercase upstream commit SHA.');
}

// Read blobs directly: Git checkout filters and Windows line endings must not
// change the upstream bytes. No upstream hooks, installers or scripts run.
export async function fetchSnapshot(commit, repository = UPSTREAM) {
  validateCommit(commit);
  const directory = await mkdtemp(path.join(tmpdir(), 'n8n-shared-skills-'));
  const git = async (...args) => (await exec('git', args, {
    cwd: directory, encoding: 'buffer', maxBuffer: 8 * 1024 * 1024, timeout: 60000,
  })).stdout;
  try {
    await git('init', '--bare', '--quiet');
    await git('fetch', '--quiet', '--no-tags', '--depth=1', '--', repository, commit);
    const tree = (await git('ls-tree', '-r', '-z', commit, '--', 'skills', 'LICENSE', 'NOTICE')).toString();
    const files = new Map();
    for (const record of tree.split('\0').filter(Boolean)) {
      const [, mode, type, file] = /^(\d+) (\w+) [a-f0-9]+\t([\s\S]+)$/.exec(record) ?? [];
      assert.ok(type === 'blob' && /^100(644|755)$/.test(mode), `Unsupported upstream entry: ${record}`);
      assert.ok(!/[\\\x00-\x1f]/.test(file) && !file.split('/').some(p => p === '.' || p === '..'), `Unsafe upstream path: ${file}`);
      files.set(file, await git('show', `${commit}:${file}`));
    }
    return files;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function readSnapshot(directory, prefix = '') {
  const files = new Map();
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return files; throw error; }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(directory, entry.name);
    const relative = prefix + entry.name;
    if (entry.isDirectory()) {
      for (const [name, bytes] of await readSnapshot(file, relative + '/')) files.set(name, bytes);
    } else {
      assert.ok(entry.isFile(), `Snapshot must contain ordinary files, not links: ${file}`);
      files.set(relative, await readFile(file));
    }
  }
  return files;
}

export function localMarkdownLinks(text) {
  // A Markdown example inside a code span or fenced block is not a file link.
  const prose = text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '').replace(/`+[^`]*`+/g, '');
  return [...prose.matchAll(/\]\(([^)]+)\)/g)].map(([, target]) => target.split('#')[0])
    .filter(target => target && !/^[a-z]+:/i.test(target));
}

export function validateSnapshot(files) {
  assert.ok(files.has('LICENSE'), 'The upstream license is required.');
  const names = new Set([...files.keys()].flatMap(file => /^skills\/([^/]+)\/SKILL\.md$/.exec(file)?.slice(1) ?? []));
  for (const name of ['using-n8n-skills-official', 'n8n-workflow-lifecycle-official', 'n8n-debugging-official']) {
    assert.ok(names.has(name), `Missing entry skill: ${name}`);
  }
  for (const name of names) {
    const text = files.get(`skills/${name}/SKILL.md`).toString();
    assert.ok(text.startsWith(`---\nname: ${name}\n`), `Invalid skill name: ${name}`);
    assert.match(text, /\ndescription: /, `Missing skill description: ${name}`);
  }
  for (const [file, bytes] of files) {
    if (!file.endsWith('.md')) continue;
    const text = bytes.toString();
    for (const [name] of text.matchAll(/\b(?:using-n8n-skills|n8n-[a-z0-9-]+)-official\b/g)) {
      assert.ok(names.has(name), `${file} references missing skill ${name}`);
    }
    for (const target of localMarkdownLinks(text)) {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), target));
      assert.ok(files.has(resolved), `${file} references missing file ${target}`);
    }
  }
  return names.size;
}

export async function syncSkills({ root = process.cwd(), check = false, commit, fetch = fetchSnapshot } = {}) {
  assert.ok(!(check && commit), '--check verifies the lock; it cannot update --commit.');
  const lockPath = path.join(root, LOCK);
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  assert.equal(lock.repository, UPSTREAM, 'Only n8n-io/skills is supported.');
  validateCommit(lock.commit);
  const revision = commit ?? lock.commit;
  validateCommit(revision);
  // Reject linked destinations before reading or replacing the owned subtree.
  let destination = root;
  for (const part of SNAPSHOT.split('/')) {
    destination = path.join(destination, part);
    const info = await lstat(destination).catch(error => { if (error.code !== 'ENOENT') throw error; });
    assert.ok(!info || info.isDirectory(), `Snapshot path must be an ordinary directory: ${destination}`);
  }
  const expected = await fetch(revision);
  const skills = validateSnapshot(expected);
  const current = await readSnapshot(destination);
  const changed = [...new Set([...expected.keys(), ...current.keys()])]
    .filter(file => !expected.get(file)?.equals(current.get(file) ?? Buffer.alloc(0)) || !current.has(file)).sort();
  if (check) {
    assert.equal(changed.length, 0, `Shared skills differ from ${revision}. Run npm run skills:sync.\n${changed.join('\n')}`);
  } else if (changed.length) {
    await mkdir(path.dirname(destination), { recursive: true });
    const staging = await mkdtemp(path.join(path.dirname(destination), '.n8n-skills-'));
    const backup = staging + '.previous';
    let moved = false;
    try {
      for (const [file, bytes] of expected) {
        const target = path.join(staging, file);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, bytes);
      }
      try { await rename(destination, backup); moved = true; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      try { await rename(staging, destination); }
      catch (error) { if (moved) await rename(backup, destination); throw error; }
      if (moved) await rm(backup, { recursive: true });
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }
  if (!check && revision !== lock.commit) {
    await writeFile(lockPath, JSON.stringify({ repository: UPSTREAM, commit: revision }, null, 2) + '\n');
  }
  return { commit: revision, skills, files: expected.size, changed: changed.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { check: { type: 'boolean' }, commit: { type: 'string' } } });
    console.log(JSON.stringify(await syncSkills(values)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
