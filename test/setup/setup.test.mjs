import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runSetup } from '../../src/setup/setup.mjs';
import { atomicWrite, parseConfig, readSnapshot, withLock } from '../../src/setup/storage.mjs';
import { fixture } from './helpers.mjs';
import { createServer } from 'node:net';

test('configure, reuse, diagnose and remove; unrelated JSONC and credentials survive', async t => {
  const f = await fixture(t);
  await mkdir(path.dirname(f.configPath), { recursive: true });
  await writeFile(f.configPath, '{\n // Keep this comment\n "other": 17,\n "mcpServers": {"existing": {"headers": {"Authorization": "SECRET"}},},\n}\n');
  const first = await runSetup(f.options, f.deps);
  assert.equal(first.status, 'configured_awaiting_authorization');
  assert.equal(f.count(), 1);
  const text = await readFile(f.configPath, 'utf8');
  assert.ok(text.includes('// Keep this comment'));
  const config = parseConfig(text);
  assert.equal(config.mcpServers.existing.headers.Authorization, 'SECRET');
  assert.equal(config.other, 17);
  assert.equal(config.mcpServers['n8n-test'].oauth.clientId, 'test-client-1');
  assert.equal(config.mcpServers['n8n-test'].oauth.clientSecret, undefined);
  assert.match(config.mcpServers['n8n-test'].headers['X-N8N-Kiro-Connection'], /^[a-f0-9]{64}$/);
  assert.equal(config.mcpServers['n8n-test'].headers.Authorization, undefined);
  if (process.platform !== 'win32') assert.equal((await stat(f.configPath)).mode & 0o777, 0o600);
  const stateText = await readFile(f.statePath, 'utf8');
  const before = await readdir(path.dirname(f.configPath));
  assert.equal((await runSetup(f.options, f.deps)).changed, false);
  assert.equal(await readFile(f.configPath, 'utf8'), text);
  assert.equal(await readFile(f.statePath, 'utf8'), stateText);
  assert.deepEqual(await readdir(path.dirname(f.configPath)), before);
  assert.equal(f.count(), 1);
  const doctor = await runSetup({ ...f.options, command: 'doctor' }, f.deps);
  assert.equal(doctor.status, 'configured_unverified');
  assert.ok(!JSON.stringify([first, doctor]).includes('SECRET'));
  const removed = await runSetup({ ...f.options, command: 'remove' }, f.deps);
  assert.equal(removed.status, 'removed');
  assert.match(removed.next, /does not revoke/);
  assert.deepEqual(parseConfig(await readFile(f.configPath, 'utf8')), { other: 17, mcpServers: { existing: { headers: { Authorization: 'SECRET' } } } });
});

test('dry-run and doctor write no state, locks or settings and never register', async t => {
  const f = await fixture(t);
  assert.equal((await runSetup({ ...f.options, dryRun: true }, f.deps)).status, 'dry_run');
  assert.equal((await runSetup({ ...f.options, command: 'doctor' }, f.deps)).status, 'setup_required');
  assert.deepEqual(await readdir(f.root), []);
  assert.equal(f.count(), 0);
});

test('unmanaged name collision and malformed JSON stop before registration', async t => {
  const f = await fixture(t);
  await mkdir(path.dirname(f.configPath), { recursive: true });
  for (const [text, code] of [
    ['{"mcpServers":{"n8n-test":{"url":"https://other.example"}}}', 'CONFIG_CONFLICT'],
    ['{"mcpServers": []}', 'INVALID_CONFIG'], ['{"bad":', 'INVALID_CONFIG'],
    ['{"mcpServers":{},"mcpServers":{}}', 'INVALID_CONFIG'],
  ]) {
    await writeFile(f.configPath, text);
    await assert.rejects(runSetup(f.options, f.deps), { code });
    assert.equal(await readFile(f.configPath, 'utf8'), text);
  }
  assert.equal(f.count(), 0);
});

test('user changes to a managed entry are preserved by configure, repair and remove', async t => {
  const f = await fixture(t);
  await runSetup(f.options, f.deps);
  const config = parseConfig(await readFile(f.configPath, 'utf8'));
  config.mcpServers['n8n-test'].disabled = true;
  const text = JSON.stringify(config);
  await writeFile(f.configPath, text);
  for (const command of ['configure', 'repair', 'remove']) {
    await assert.rejects(runSetup({ ...f.options, command, ...(command === 'repair' ? { newRegistration: true } : {}) }, f.deps), { code: 'CONFIG_CONFLICT' });
    assert.equal(await readFile(f.configPath, 'utf8'), text);
  }
  assert.equal(f.count(), 1);
});

test('workspace override is detected before a user-level registration', async t => {
  const f = await fixture(t);
  const workspace = path.join(f.root, 'workspace with spaces ü');
  const file = path.join(workspace, '.kiro/settings/mcp.json');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, '{"mcpServers":{"n8n-test":{"disabled":true}}}');
  await assert.rejects(runSetup({ ...f.options, workspace }, f.deps), { code: 'WORKSPACE_OVERRIDE' });
  assert.equal(f.count(), 0);
});

test('workspace scope writes only the selected workspace config', async t => {
  const f = await fixture(t);
  const workspace = path.join(f.root, 'workspace with spaces ü');
  await mkdir(workspace);
  const result = await runSetup({ ...f.options, workspace, scope: 'workspace' }, f.deps);
  assert.equal(result.configPath, path.join(workspace, '.kiro/settings/mcp.json'));
  assert.equal(await readSnapshot(f.configPath), null);
});

test('invalid state prevents accidental duplicate registration', async t => {
  const f = await fixture(t);
  await mkdir(path.dirname(f.statePath), { recursive: true });
  await writeFile(f.statePath, '{corrupt');
  await assert.rejects(runSetup(f.options, f.deps), { code: 'INVALID_STATE' });
  assert.equal(f.count(), 0);
});

test('a failed settings write resumes with the saved registration', async t => {
  const f = await fixture(t);
  await assert.rejects(runSetup(f.options, { ...f.deps, atomicWrite: async (file, ...args) => {
    if (file === f.configPath) throw new Error('simulated disk failure');
    return await atomicWrite(file, ...args);
  } }), /simulated disk failure/);
  assert.equal(f.count(), 1);
  await runSetup(f.options, f.deps);
  assert.equal(f.count(), 1);
  assert.equal(parseConfig(await readFile(f.configPath, 'utf8')).mcpServers['n8n-test'].oauth.clientId, 'test-client-1');
});

test('failed replacement config write resumes with old entry ownership intact', async t => {
  const f = await fixture(t);
  await runSetup(f.options, f.deps);
  const originalHeader = parseConfig(await readFile(f.configPath, 'utf8')).mcpServers['n8n-test'].headers['X-N8N-Kiro-Connection'];
  await assert.rejects(runSetup({ ...f.options, command: 'repair', newRegistration: true }, { ...f.deps, atomicWrite: async (file, ...args) => {
    if (file === f.configPath) throw new Error('simulated disk failure');
    return await atomicWrite(file, ...args);
  } }), /simulated disk failure/);
  await runSetup(f.options, f.deps);
  assert.equal(f.count(), 2);
  assert.equal(parseConfig(await readFile(f.configPath, 'utf8')).mcpServers['n8n-test'].oauth.clientId, 'test-client-2');
  assert.notEqual(parseConfig(await readFile(f.configPath, 'utf8')).mcpServers['n8n-test'].headers['X-N8N-Kiro-Connection'], originalHeader);
});

test('uncertain registration is journaled and requires explicit repair to retry', async t => {
  const f = await fixture(t);
  await assert.rejects(runSetup(f.options, { ...f.deps, register: async () => { throw new Error('simulated interrupted POST'); } }));
  await assert.rejects(runSetup(f.options, f.deps), { code: 'REGISTRATION_UNCERTAIN' });
  assert.equal(f.count(), 0);
  await runSetup({ ...f.options, command: 'repair', newRegistration: true }, f.deps);
  assert.equal(f.count(), 1);
});

test('later port use does not invalidate a reused registration or cause another POST', async t => {
  const f = await fixture(t);
  await runSetup(f.options, f.deps);
  const deps = { ...f.deps, availablePort: async () => { throw new Error('occupied'); } };
  assert.equal((await runSetup(f.options, deps)).registration, 'reused');
  assert.equal((await runSetup({ ...f.options, command: 'doctor' }, deps)).callback, 'listening_or_unavailable');
  assert.equal(f.count(), 1);
});

test('unsupported Kiro and invalid callback ports do not register', async t => {
  const f = await fixture(t);
  await assert.rejects(runSetup({ ...f.options, kiroVersion: '9.0.0' }, f.deps), { code: 'KIRO_VERSION' });
  await assert.rejects(runSetup({ ...f.options, callbackPort: 0 }, f.deps), { code: 'CALLBACK_PORT' });
  assert.equal(f.count(), 0);
});

test('atomic writes reject concurrent changes and preserve the external edit', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.root, 'settings.json'), 'new');
  await assert.rejects(atomicWrite(path.join(f.root, 'settings.json'), 'old', 'replacement'), { code: 'CONCURRENT_EDIT' });
  assert.equal(await readFile(path.join(f.root, 'settings.json'), 'utf8'), 'new');
});

test('locks reject another writer and are released even on failure', async t => {
  const f = await fixture(t);
  const file = path.join(f.root, 'locked.json');
  await withLock(file, () => assert.rejects(withLock(file, () => {}), { code: 'LOCKED' }));
  await assert.rejects(withLock(file, () => { throw new Error('failure'); }), /failure/);
  await withLock(file, () => {});
});

test('symlinked settings are never overwritten', async t => {
  const f = await fixture(t);
  const directory = path.join(f.root, 'elsewhere');
  await mkdir(directory);
  await symlink(directory, path.join(f.root, '.kiro'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(runSetup(f.options, f.deps), { code: 'SYMLINK' });
  assert.equal(f.count(), 0);
});

test('two instances have separate managed entries and removal preserves the other', async t => {
  const a = await fixture(t);
  const b = await fixture(t);
  const first = await runSetup({ ...a.options, name: undefined }, a.deps);
  const second = await runSetup({ ...b.options, name: undefined }, a.deps);
  assert.notEqual(first.serverName, second.serverName);
  const before = parseConfig(await readFile(a.configPath, 'utf8')).mcpServers[second.serverName];
  await runSetup({ ...a.options, name: undefined, command: 'remove' }, a.deps);
  assert.deepEqual(parseConfig(await readFile(a.configPath, 'utf8')).mcpServers, { [second.serverName]: before });
  assert.equal(a.count(), 1);
  assert.equal(b.count(), 1);
});

test('an occupied requested callback fails before registration; repair changes the callback', async t => {
  const f = await fixture(t);
  const listener = createServer();
  await new Promise(resolve => listener.listen(0, 'localhost', resolve));
  t.after(() => new Promise(resolve => listener.close(resolve)));
  await assert.rejects(runSetup({ ...f.options, callbackPort: listener.address().port }, f.deps), { code: 'CALLBACK_PORT' });
  assert.equal(f.count(), 0);
  const first = await runSetup(f.options, f.deps);
  const oldPort = Number(new URL(first.callbackUri).port);
  await assert.rejects(runSetup({ ...f.options, callbackPort: oldPort === 65535 ? 65534 : oldPort + 1 }, f.deps), { code: 'CALLBACK_CHANGE' });
  const repaired = await runSetup({ ...f.options, command: 'repair', newRegistration: true }, f.deps);
  assert.equal(repaired.registration, 'created');
  assert.equal(f.count(), 2);
});

test('registration policy failure preserves settings and is not automatically retried', async t => {
  const f = await fixture(t, { registrationStatus: 400 });
  await assert.rejects(runSetup(f.options, f.deps), { code: 'REGISTRATION_REJECTED' });
  assert.equal(await readSnapshot(f.configPath), null);
  await assert.rejects(runSetup(f.options, f.deps), { code: 'REGISTRATION_UNCERTAIN' });
  assert.equal(f.count(), 1);
});
