import test from 'node:test';
import assert from 'node:assert/strict';
import { discover, normalizeEndpoint, register, request } from '../../src/setup/discovery.mjs';
import { fixture } from './helpers.mjs';

test('normalizes host and endpoint URLs without losing a deployment base path', () => {
  assert.equal(normalizeEndpoint('https://N8N.example/team/'), 'https://n8n.example/team/mcp-server/http');
  assert.equal(normalizeEndpoint('https://n8n.example/team/mcp-server/http/'), 'https://n8n.example/team/mcp-server/http');
  assert.equal(normalizeEndpoint('http://[::1]:5678'), 'http://[::1]:5678/mcp-server/http');
});

test('rejects remote HTTP, embedded credentials and URL secrets without echoing them', () => {
  for (const url of ['http://example.com', 'https://name:SECRET@example.com', 'https://example.com?token=SECRET', 'https://example.com#SECRET', 'javascript:SECRET', 'SECRET']) {
    assert.throws(() => normalizeEndpoint(url), error => error.code === 'INVALID_URL' && !error.message.includes('SECRET'));
  }
});

test('rejects the shipped placeholder host, including its fully qualified form', () => {
  for (const url of ['https://YOUR-N8N-HOST', 'https://your-n8n-host/mcp-server/http', 'https://your-n8n-host./team']) {
    assert.throws(() => normalizeEndpoint(url), { code: 'PLACEHOLDER_URL' });
  }
});

test('does not reject real hosts that merely resemble the placeholder', () => {
  // n8n Cloud tenants pick their own subdomain, so a plausible-looking guess must still resolve.
  assert.equal(normalizeEndpoint('https://your-instance.app.n8n.cloud'), 'https://your-instance.app.n8n.cloud/mcp-server/http');
  assert.equal(normalizeEndpoint('https://your-n8n-host.example.org'), 'https://your-n8n-host.example.org/mcp-server/http');
  assert.equal(normalizeEndpoint('https://n8n.example.com/team'), 'https://n8n.example.com/team/mcp-server/http');
});

test('discovers path-bearing issuers and registers exactly a public PKCE client', async t => {
  const f = await fixture(t, { base: '/team' });
  const discovery = await discover(f.endpoint);
  assert.equal(discovery.issuer, f.url);
  assert.equal(await register(discovery, 'http://localhost:4567/oauth/callback'), 'test-client-1');
  const post = f.requests.find(r => r.method === 'POST');
  assert.deepEqual(post.body, { client_name: 'n8n for Kiro', redirect_uris: ['http://localhost:4567/oauth/callback'],
    token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] });
  assert.equal(post.headers.authorization, undefined);
});

for (const [name, changes, code] of [
  ['mismatched resource', { resource: { resource: 'https://other.example/mcp' } }, 'DISCOVERY'],
  ['cross-origin issuer', { resource: { authorization_servers: ['https://other.example'] } }, 'UNSUPPORTED_ISSUER'],
  ['issuer mismatch', { metadata: { issuer: 'https://wrong.example' } }, 'ISSUER_MISMATCH'],
  ['cross-origin registration', { metadata: { registration_endpoint: 'https://other.example/register' } }, 'UNSUPPORTED_ISSUER'],
  ['missing public-client support', { metadata: { token_endpoint_auth_methods_supported: ['client_secret_basic'] } }, 'UNSUPPORTED_OAUTH'],
  ['missing PKCE', { metadata: { code_challenge_methods_supported: ['plain'] } }, 'UNSUPPORTED_OAUTH'],
]) test(`rejects ${name} before registration`, async t => {
  const f = await fixture(t, changes);
  await assert.rejects(discover(f.endpoint), { code });
  assert.equal(f.count(), 0);
});

for (const [name, registration] of [
  ['client secret', { client_secret: 'SECRET' }], ['wrong method', { token_endpoint_auth_method: 'client_secret_post' }],
  ['wrong callback', { redirect_uris: ['http://localhost:1234/other'] }], ['missing refresh', { grant_types: ['authorization_code'] }],
]) test(`rejects a registration with ${name}`, async t => {
  const f = await fixture(t, { registration });
  await assert.rejects(register(await discover(f.endpoint), 'http://localhost:4567/oauth/callback'), error => error.code === 'REGISTRATION_UNCERTAIN' && !error.message.includes('SECRET'));
});

test('network timeout does not retry registration or expose response details', async t => {
  const f = await fixture(t);
  let attempts = 0;
  await assert.rejects(register(await discover(f.endpoint), 'http://localhost:4567/oauth/callback', {
    timeout: 30,
    fetchImpl: async (_url, { signal }) => {
      attempts++;
      signal.throwIfAborted();
      return await new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    },
  }), { code: 'REGISTRATION_UNCERTAIN' });
  assert.equal(attempts, 1);
});

test('rejects redirects without following them', async t => {
  const f = await fixture(t, { handle(req, res) { res.writeHead(302, { location: 'https://other.example?secret=SECRET' }); res.end(); return true; } });
  await assert.rejects(discover(f.endpoint), error => error.code === 'REDIRECT' && !error.message.includes('SECRET'));
  assert.equal(f.requests.length, 1);
});

test('bounds metadata and never echoes non-JSON proxy pages', async t => {
  const f = await fixture(t, { handle(req, res) { res.end('SECRET'.repeat(30000)); return true; } });
  await assert.rejects(request(f.url), error => error.code === 'INVALID_RESPONSE' && !error.message.includes('SECRET'));
});
