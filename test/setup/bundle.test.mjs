import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fixture } from './helpers.mjs';

test('shipped bundle works alone, with a path containing spaces and no node_modules', async t => {
  const f = await fixture(t);
  const target = path.join(f.root, 'standalone helper ü.mjs');
  await copyFile('skills/connect-n8n/scripts/setup.mjs', target);
  const { stdout } = await promisify(execFile)(process.execPath, [target, '--help'], { cwd: f.root });
  assert.match(stdout, /configure\|doctor\|repair\|remove/);
  const { runSetup } = await import(pathToFileURL(target));
  const result = await runSetup(f.options, f.deps);
  assert.equal(result.status, 'configured_awaiting_authorization');
  assert.equal(JSON.parse(await readFile(f.configPath, 'utf8')).mcpServers['n8n-test'].oauth.clientId, 'test-client-1');
});

test('CLI errors are structured, nonzero and do not echo secret arguments', async () => {
  await assert.rejects(promisify(execFile)(process.execPath, ['skills/connect-n8n/scripts/setup.mjs', 'configure', '--url', 'https://user:SECRET@example.com', '--json']), error => {
    const result = JSON.parse(error.stdout);
    return error.code === 1 && result.code === 'INVALID_URL' && !error.stdout.includes('SECRET');
  });
});

const launchModes = [
  { name: 'default resolution', args: [], options: {} },
  { name: 'preserve-symlinks-main flag', args: ['--preserve-symlinks-main'], options: {} },
  { name: 'preserve-symlinks-main in NODE_OPTIONS', args: [], options: {
    env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --preserve-symlinks-main`.trim() },
  } },
];

for (const mode of launchModes) {
  test(`CLI runs through a symlinked directory with ${mode.name} and reports errors`, async t => {
    const f = await fixture(t);
    const directory = path.join(f.root, 'real directory');
    const alias = path.join(f.root, 'linked directory');
    await mkdir(directory);
    await copyFile('skills/connect-n8n/scripts/setup.mjs', path.join(directory, 'setup.mjs'));
    await symlink(directory, alias, process.platform === 'win32' ? 'junction' : 'dir');
    const target = path.join(alias, 'setup.mjs');
    const { stdout } = await promisify(execFile)(process.execPath, [...mode.args, target, '--help'], mode.options);
    assert.match(stdout, /configure\|doctor\|repair\|remove/);
    await assert.rejects(promisify(execFile)(process.execPath, [...mode.args, target, 'configure', '--json'], mode.options), error => {
      return error.code === 1 && JSON.parse(error.stdout).code === 'ARGUMENT';
    });
  });

  test(`CLI runs through a symlinked file with ${mode.name}`, { skip: process.platform === 'win32' }, async t => {
    const f = await fixture(t);
    const target = path.join(f.root, 'setup.mjs');
    const alias = path.join(f.root, 'linked helper.mjs');
    await copyFile('skills/connect-n8n/scripts/setup.mjs', target);
    await symlink(target, alias);
    const { stdout } = await promisify(execFile)(process.execPath, [...mode.args, alias, '--help'], mode.options);
    assert.match(stdout, /configure\|doctor\|repair\|remove/);
  });

  test(`importing the bundle with ${mode.name} does not run the CLI`, async () => {
    const target = pathToFileURL(path.resolve('skills/connect-n8n/scripts/setup.mjs')).href;
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [...mode.args, '--input-type=module', '-e', `await import(${JSON.stringify(target)})`], mode.options);
    assert.equal(stdout, '');
    assert.equal(stderr, '');
  });
}
