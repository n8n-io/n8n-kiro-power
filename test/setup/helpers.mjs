import { createServer } from 'node:http';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export async function fixture(t, changes = {}) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'n8n-kiro-test-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const requests = [];
  let registrations = 0;
  let origin;
  const base = changes.base ?? '';
  const server = createServer(async (req, res) => {
    let body;
    try {
      let raw = '';
      for await (const part of req) raw += part;
      body = raw ? JSON.parse(raw) : undefined;
    } catch {
      if (!res.destroyed) res.writeHead(400, { 'Content-Type': 'application/json' }).end('{"error":"invalid_request"}');
      return;
    }
    requests.push({ method: req.method, path: req.url, body, headers: req.headers });
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    if (await changes.handle?.(req, res, body)) return;
    if (req.url === `${base}/mcp-server/http`) {
      res.writeHead(401, { 'www-authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource${base}/mcp-server/http"` });
      res.end();
    } else if (req.url === `/.well-known/oauth-protected-resource${base}/mcp-server/http`) {
      send(200, { resource: `${origin}${base}/mcp-server/http`, authorization_servers: [`${origin}${base}`], ...changes.resource });
    } else if (req.url === `/.well-known/oauth-authorization-server${base}`) {
      send(200, { issuer: `${origin}${base}`, registration_endpoint: `${origin}${base}/register`,
        authorization_endpoint: `${origin}${base}/authorize`, token_endpoint: `${origin}${base}/token`,
        token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'], code_challenge_methods_supported: ['S256'],
        grant_types_supported: ['authorization_code', 'refresh_token'], response_types_supported: ['code'], ...changes.metadata });
    } else if (req.url === `${base}/register`) {
      registrations++;
      send(changes.registrationStatus ?? 201, { ...body, client_id: `test-client-${registrations}`, ...changes.registration });
    } else send(404, { error: 'not_found' });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return {
    root, url: `${origin}${base}`, endpoint: `${origin}${base}/mcp-server/http`, requests,
    configPath: path.join(root, '.kiro/settings/mcp.json'), statePath: path.join(root, '.kiro/n8n-power/connections.json'),
    options: { url: `${origin}${base}`, kiroVersion: '1.1.70', name: 'n8n-test' },
    deps: { homeDir: root }, count: () => registrations,
  };
}
