import { createHash } from 'node:crypto';
import { fail, isObject, SetupError } from './errors.mjs';

const MAX_RESPONSE_BYTES = 128 * 1024;
export const SCOPES = ['workflow:read', 'workflow:write', 'workflow:execute', 'execution:read'];

// Hostnames this repository ships as placeholders. An agent that copies a
// documented command without substituting the user's instance otherwise reaches
// discovery and gets a generic network error, which reads as an outage rather
// than a missing argument.
//
// Keep this to single labels that appear verbatim in our own examples. A
// qualified placeholder is unsafe to list: n8n Cloud tenants choose their own
// <name>.app.n8n.cloud subdomain, so a guess at a plausible-looking one can
// reject a real instance. A single label can still collide with an internal
// hostname, so the error says what was assumed rather than that the URL is wrong.
const PLACEHOLDER_HOSTS = new Set(['your-n8n-host']);

export function safeUrl(value, origin) {
  let url;
  try { url = new URL(value); } catch { fail('INVALID_URL', 'Use an absolute n8n instance or MCP URL.'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
      url.username || url.password || url.search || url.hash) {
    fail('INVALID_URL', 'Use HTTPS (HTTP is allowed on loopback), without credentials, query parameters or fragments.');
  }
  if (origin && url.origin !== origin) {
    fail('UNSUPPORTED_ISSUER', 'This helper supports OAuth metadata and endpoints on the same origin as n8n.');
  }
  return url;
}

export function normalizeEndpoint(value) {
  const url = safeUrl(value);
  // A trailing dot is a valid fully qualified form of the same name.
  if (PLACEHOLDER_HOSTS.has(url.hostname.replace(/\.$/, ''))) {
    fail('PLACEHOLDER_URL', 'That host is the placeholder from this power\'s examples, so it was read as an unsubstituted command rather than an instance. Ask the user for their n8n URL, or read it from n8n Settings > Instance-level MCP > Connection details.');
  }
  const base = url.pathname.replace(/\/+$/, '');
  url.pathname = base.endsWith('/mcp-server/http') ? base : `${base}/mcp-server/http`;
  return url.href;
}

export function defaultName(endpoint) {
  const host = new URL(endpoint).hostname.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 40);
  const suffix = createHash('sha256').update(endpoint).digest('hex').slice(0, 10);
  return `n8n-${host}-${suffix}`;
}

// Never return raw network exceptions or response bodies: they can contain secrets.
export async function request(url, { method = 'GET', body, timeout = 10000, fetchImpl = fetch, probe = false } = {}) {
  try {
    const response = await fetchImpl(url, {
      method, redirect: 'manual', signal: AbortSignal.timeout(timeout),
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const status = response.status;
    const challenge = response.headers.get('www-authenticate');
    if (status >= 300 && status < 400) {
      await response.body?.cancel();
      fail('REDIRECT', 'The server redirected the request. Use its final n8n URL; login-proxy redirects are unsupported.');
    }
    if (probe) {
      await response.body?.cancel();
      return { status, challenge };
    }
    const reader = response.body?.getReader();
    const chunks = [];
    let size = 0;
    if (reader) {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          fail('INVALID_RESPONSE', 'The server response exceeded the metadata size limit.');
        }
        chunks.push(part.value);
      }
    }
    let data;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {
      fail('INVALID_RESPONSE', `Expected JSON from n8n (HTTP ${status}). Check the URL, MCP setting and reverse proxy.`);
    }
    if (!isObject(data)) fail('INVALID_RESPONSE', 'Expected a JSON metadata object from n8n.');
    return { status, data };
  } catch (error) {
    if (error instanceof SetupError) throw error;
    fail('NETWORK', 'The n8n request failed or timed out. Check connectivity and the configured URL.');
  }
}

export async function discover(endpoint, options = {}) {
  const resourceUrl = safeUrl(endpoint);
  const probe = await request(endpoint, { ...options, probe: true });
  const match = probe.challenge?.match(/\bresource_metadata\s*=\s*"([^"\r\n]+)"/i);
  if (probe.status !== 401 || !match) {
    fail('DISCOVERY', `Expected an OAuth resource-metadata challenge (HTTP ${probe.status}). Check the MCP endpoint, instance setting and proxy.`);
  }
  const metadataUrl = safeUrl(match[1], resourceUrl.origin);
  const resource = await request(metadataUrl.href, options);
  if (resource.status !== 200 || resource.data.resource !== endpoint ||
      !Array.isArray(resource.data.authorization_servers) || resource.data.authorization_servers.length !== 1) {
    fail('DISCOVERY', 'Resource metadata must match this MCP endpoint and advertise one authorization server.');
  }
  const issuer = resource.data.authorization_servers[0];
  const issuerUrl = safeUrl(issuer, resourceUrl.origin);
  const path = issuerUrl.pathname === '/' ? '' : issuerUrl.pathname;
  const metadata = await request(`${issuerUrl.origin}/.well-known/oauth-authorization-server${path}`, options);
  if (metadata.status !== 200 || metadata.data.issuer !== issuer) {
    fail('ISSUER_MISMATCH', 'OAuth discovery must return an issuer identical to the advertised authorization server.');
  }
  const data = metadata.data;
  for (const key of ['authorization_endpoint', 'token_endpoint', 'registration_endpoint']) safeUrl(data[key], resourceUrl.origin);
  for (const [key, required] of Object.entries({
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
  })) {
    if (!Array.isArray(data[key]) || required.some(value => !data[key].includes(value))) {
      fail('UNSUPPORTED_OAUTH', 'This server must advertise public clients, S256 PKCE, authorization codes and refresh tokens.');
    }
  }
  return { issuer, registrationEndpoint: data.registration_endpoint };
}

export async function register(discovery, callbackUri, options = {}) {
  const body = {
    client_name: 'n8n for Kiro', redirect_uris: [callbackUri],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'],
  };
  let result;
  try { result = await request(discovery.registrationEndpoint, { ...options, method: 'POST', body }); } catch {
    fail('REGISTRATION_UNCERTAIN', 'Registration may have reached n8n, but no valid response was received. Do not retry automatically; consult the instance administrator and use repair --new-registration to explicitly retry.');
  }
  if (result.status !== 201) {
    fail('REGISTRATION_REJECTED', `n8n rejected public-client registration (HTTP ${result.status}). Check callback policy and registered-client limits with the administrator.`);
  }
  const data = result.data;
  if (typeof data.client_id !== 'string' || !data.client_id || data.client_id.length > 2048 ||
      /[\x00-\x1f\x7f]/.test(data.client_id) || 'client_secret' in data ||
      data.token_endpoint_auth_method !== 'none' ||
      !Array.isArray(data.redirect_uris) || data.redirect_uris.length !== 1 || data.redirect_uris[0] !== callbackUri ||
      !Array.isArray(data.grant_types) || !body.grant_types.every(value => data.grant_types.includes(value)) ||
      !Array.isArray(data.response_types) || !data.response_types.includes('code')) {
    fail('REGISTRATION_UNCERTAIN', 'n8n returned an unexpected registration. It was not installed. Consult the instance administrator before repair --new-registration.');
  }
  return data.client_id;
}
