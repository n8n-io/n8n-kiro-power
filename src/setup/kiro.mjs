import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { promisify } from 'node:util';
import { fail } from './errors.mjs';
import { SCOPES } from './discovery.mjs';

export async function detectKiroVersion() {
  if (process.platform === 'darwin') {
    try {
      const product = JSON.parse(await readFile('/Applications/Kiro.app/Contents/Resources/app/product.json', 'utf8'));
      if (product.applicationName === 'kiro') return product.version;
    } catch { /* Try the installed CLI next. */ }
  }
  try {
    const { stdout } = await promisify(execFile)('kiro', ['--version'], { timeout: 10000, maxBuffer: 4096, windowsHide: true });
    return stdout.match(/^\d+\.\d+\.\d+$/m)?.[0];
  } catch { return undefined; }
}

export function requireSupportedKiro(version) {
  if (version !== '1.1.70') {
    fail('KIRO_VERSION', 'The current helper is validated for Kiro IDE 1.1.70 only. Check Help > About; supply --kiro-version 1.1.70 only if that is the installed version.');
  }
}

export async function availablePort(port = 0) {
  if (!Number.isInteger(port) || (port !== 0 && (port < 1024 || port > 65535))) {
    fail('CALLBACK_PORT', 'Choose a callback port between 1024 and 65535.');
  }
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () => reject(Object.assign(new Error('Callback port is unavailable. Choose another --callback-port.'), { code: 'CALLBACK_PORT' })));
    server.listen(port, 'localhost', () => {
      const selected = server.address().port;
      server.close(error => error ? reject(error) : resolve(selected));
    });
  });
}

export function callbackUri(port) { return `http://localhost:${port}/oauth/callback`; }

export function connectionConfig(endpoint, clientId, port) {
  return {
    url: endpoint, timeout: 300000,
    // Kiro 1.1.70 keys credentials by URL + headers, ignoring oauth.clientId.
    // A public identifier isolates grants after repair and from other clients.
    headers: { 'X-N8N-Kiro-Connection': createHash('sha256').update(clientId).digest('hex') },
    oauth: { clientId, redirectUri: `localhost:${port}` },
    // 1.1.70 accepts this field but may request all advertised scopes. Consent remains authoritative.
    oauthScopes: SCOPES,
  };
}
