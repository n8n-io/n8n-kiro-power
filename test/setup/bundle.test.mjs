import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, readFile } from 'node:fs/promises';
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
