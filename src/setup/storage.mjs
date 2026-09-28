import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { applyEdits, modify, parse, parseTree } from 'jsonc-parser';
import { fail, isObject } from './errors.mjs';

const MAX_FILE_BYTES = 1024 * 1024;

export function fingerprint(value) {
  const canonical = value => Array.isArray(value) ? value.map(canonical) :
    isObject(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export async function assertSafePath(file) {
  const parsed = path.parse(file);
  let current = parsed.root;
  for (const segment of file.slice(parsed.root.length).split(path.sep)) {
    current = path.join(current, segment);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) fail('SYMLINK', 'A configuration or state path contains a symlink. Use its real directory and inspect it before setup.');
      if (current !== file && !stat.isDirectory()) fail('FILE_PATH', 'A settings parent path is not a directory.');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

export async function readSnapshot(file) {
  await assertSafePath(file);
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) fail('FILE_SIZE', 'Settings must be a regular file smaller than 1 MiB.');
    return await readFile(file, 'utf8');
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export function parseConfig(text) {
  if (text === null) return {};
  const errors = [];
  const data = parse(text, errors, { allowTrailingComma: true });
  const tree = parseTree(text);
  const checkDuplicates = node => {
    if (node?.type === 'object') {
      const names = node.children.map(property => property.children[0].value);
      if (new Set(names).size !== names.length) fail('INVALID_CONFIG', 'Settings contain duplicate JSON keys. Resolve them before setup.');
    }
    for (const child of node?.children ?? []) checkDuplicates(child);
  };
  checkDuplicates(tree);
  if (errors.length || !isObject(data) || ('mcpServers' in data && !isObject(data.mcpServers))) {
    fail('INVALID_CONFIG', 'Kiro settings are not a valid JSON/JSONC object with an mcpServers object. No settings were changed.');
  }
  return data;
}

export function editConfig(text, name, entry) {
  parseConfig(text);
  const input = text ?? '{}\n';
  const eol = input.includes('\r\n') ? '\r\n' : '\n';
  return applyEdits(input, modify(input, ['mcpServers', name], entry, {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol },
  }));
}

export function parseState(text) {
  if (text === null) return { version: 1, connections: {} };
  let data;
  try { data = JSON.parse(text); } catch { fail('INVALID_STATE', 'Registration state is invalid. Restore its backup before setup; no new client was registered.'); }
  if (!isObject(data) || data.version !== 1 || !isObject(data.connections)) fail('INVALID_STATE', 'Registration state has an unsupported format.');
  for (const record of Object.values(data.connections)) {
    if (!isObject(record) || !['ready', 'registering', 'uncertain'].includes(record.status) ||
        ['endpoint', 'issuer', 'registrationEndpoint', 'serverName', 'configPath', 'kiroVersion'].some(key => typeof record[key] !== 'string') ||
        !Number.isInteger(record.callbackPort) || record.callbackPort < 1024 || record.callbackPort > 65535 ||
        (record.status === 'ready' && (typeof record.clientId !== 'string' || !record.clientId)) ||
        (record.fingerprint !== undefined && typeof record.fingerprint !== 'string')) {
      fail('INVALID_STATE', 'A registration record is invalid. Inspect or restore state before setup.');
    }
  }
  return data;
}

export async function withLock(file, action) {
  const lockPath = `${file}.lock`;
  await assertSafePath(lockPath);
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  let handle;
  try { handle = await open(lockPath, 'wx', 0o600); } catch (error) {
    if (error.code === 'EEXIST') fail('LOCKED', 'Another setup may be running. If it crashed, verify no helper is active before removing the .lock file beside its state/config.');
    throw error;
  }
  try { return await action(); } finally { await handle.close(); await rm(lockPath, { force: true }); }
}

export async function atomicWrite(file, original, next) {
  if (next === original) return;
  await assertSafePath(file);
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  if (await readSnapshot(file) !== original) fail('CONCURRENT_EDIT', 'Settings changed during setup. Rerun to inspect the current file; the new registration is retained.');
  const temporary = `${file}.${randomUUID()}.tmp`;
  let backup;
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(next); await handle.sync(); } finally { await handle.close(); }
    if (original !== null) {
      backup = `${file}.${randomUUID()}.bak`;
      const handle = await open(backup, 'wx', 0o600);
      try { await handle.writeFile(original); } finally { await handle.close(); }
    }
    // The helper lock coordinates helper processes. This last check also catches
    // editor writes during setup; it cannot make arbitrary external writers transactional.
    if (await readSnapshot(file) !== original) fail('CONCURRENT_EDIT', 'Settings changed during setup. Rerun without overwriting the current file.');
    await rename(temporary, file);
  } finally { await rm(temporary, { force: true }); }
  return backup;
}
