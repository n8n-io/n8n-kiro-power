# OAuth compatibility investigation

On 2026-09-25, Kiro IDE 1.1.70 imported and activated this power, but could not
complete an MCP connection to the tested n8n Cloud instance. The browser showed
**Authorization Successful**; Kiro subsequently reported a missing `client_id`.
No MCP read, workflow change, or execution succeeded against that Cloud instance.
The user confirmed it runs n8n Cloud **2.39.6**. A subsequent local server fix
completed OAuth and an MCP read in Kiro; see the local verification below. A
compatible client configuration or released server fix still needs live
verification on Cloud. The later [public-client OAuth test](public-oauth-acceptance.md)
completed local Kiro authorization, refresh, and workflow execution without the
Basic-authentication middleware. That alternative requires a setup helper and
native per-user MCP settings; it is not the configuration currently shipped here.

## Observed behavior

1. Import the configured package and activate it with a read-only connection
   prompt. Kiro loads `connect-n8n` but shows the MCP server as **Unauthenticated**.
2. Select **Kiro > MCP Servers > Authenticate** and complete browser consent.
3. The browser reports success. Kiro reports:

   ```text
   expected: string
   code: invalid_type
   path: [client_id]
   message: Invalid input: expected string, received undefined
   ```

4. **Retry** returns the server to **Unauthenticated**.

Earlier attempts timed out after 60 seconds. The completed browser attempt
failed before that timeout, so timeout recovery does not resolve this error.

## Independent endpoint check

The instance's public OAuth discovery document advertises `none`,
`client_secret_post`, and `client_secret_basic`. Three bounded requests with a
nonexistent synthetic client produced:

| Authentication method | HTTP response | OAuth response |
|---|---|---|
| HTTP Basic header; no client ID in body | 400 | `invalid_request`: missing `client_id`, matching Kiro's error |
| Client ID and secret in body | 400 | `invalid_client`: `Invalid client_id` |
| Client ID in body, no secret | 400 | `invalid_client`: `Invalid client_id` |

These probes validate parsing only. They use no real credentials or valid
authorization codes and do not establish successful authentication.

To reproduce against an instance you administer, replace the placeholder base
URL. The discovery document supplies the token endpoint if its path differs.
Keep the deliberately invalid values below:

```sh
n8n_base='https://YOUR-N8N-HOST'
curl --silent --show-error "$n8n_base/.well-known/oauth-authorization-server"
curl --silent --show-error \
  --user 'kiro-power-diagnostic-nonexistent-client:synthetic-invalid-secret' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'code=synthetic-invalid-code' \
  --data-urlencode 'redirect_uri=http://localhost:1/oauth/callback' \
  --data-urlencode 'code_verifier=synthetic-invalid-verifier' \
  "$n8n_base/mcp-oauth/token"
curl --silent --show-error \
  --data-urlencode 'client_id=kiro-power-diagnostic-nonexistent-client' \
  --data-urlencode 'client_secret=synthetic-invalid-secret' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'code=synthetic-invalid-code' \
  --data-urlencode 'redirect_uri=http://localhost:1/oauth/callback' \
  --data-urlencode 'code_verifier=synthetic-invalid-verifier' \
  "$n8n_base/mcp-oauth/token"
```

## Source evidence and diagnosis

The [n8n 2.39.6 controller](https://github.com/n8n-io/n8n/blob/n8n%402.39.6/packages/cli/src/modules/oauth-server/oauth.controller.ts)
advertises Basic authentication and delegates token handling to the MCP SDK.
Its [lockfile](https://github.com/n8n-io/n8n/blob/n8n%402.39.6/pnpm-lock.yaml)
pins that SDK to 1.26.0. The reviewed
[2.40.7 controller](https://github.com/n8n-io/n8n/blob/n8n%402.40.7/packages/cli/src/modules/oauth-server/oauth.controller.ts)
and [lockfile](https://github.com/n8n-io/n8n/blob/n8n%402.40.7/pnpm-lock.yaml)
retain the same behavior and dependency. Upgrading to that version alone is
not a verified resolution.

The [SDK's client-authentication middleware](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.26.0/src/server/auth/middleware/clientAuth.ts)
requires `client_id` in `req.body` and does not parse a Basic authorization
header. Its [registration handler](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.26.0/src/server/auth/handlers/register.ts)
generates a client secret unless registration explicitly requests the `none`
authentication method.

Inspection of the installed Kiro 1.1.70 bundle found that its registration
metadata omits that method. Its client-authentication selection prefers Basic
when a secret exists and the server advertises Basic, consistent with the
[SDK client selection logic](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.26.0/src/client/auth.ts).
Together with the matching endpoint error, this indicated an OAuth
client-authentication mismatch. The Cloud token request was not captured. The
later local test confirmed that Kiro sends Basic authentication; only the auth
scheme and response status were recorded, not credential values. No saved client
secrets or tokens were inspected.

## Local server fix and regression tests

A local fix was implemented on n8n master
[`8ccb6cd0a05`](https://github.com/n8n-io/n8n/commit/8ccb6cd0a05)
(2.41.0 development). Middleware decodes OAuth HTTP Basic credentials into the
fields expected by the SDK before the token and revocation handlers. Existing
client-secret validation and PKCE verification still run. Requests that combine
Basic credentials with body credentials are rejected.

The new integration cases reproduce the missing `client_id` failure without the
fix, for both `/mcp-oauth` and `/oauth`. With the fix, they cover authorization
code exchange, rejection of an incorrect secret or PKCE verifier, refresh-token
rotation, revocation, and rejection of a revoked refresh token. All 83 targeted
unit and integration tests passed, along with CLI lint, typecheck, and build.

The patched backend was tested in an isolated local development instance with
Kiro IDE 1.1.70. After the maintainer completed consent, the actual Kiro token
exchange used HTTP Basic and returned **200**. Kiro showed **Connected (55
tools)**. Activating the installed power, loading `connect-n8n`, and calling
`search_workflows` with `limit: 5` returned `{"data":[],"count":0}`. Kiro also
reconnected automatically after **Developer: Reload Window**, without another
consent prompt. This reconnect reused the saved authorization; it does not
establish that Kiro refreshed an expired token.

The server changes were submitted in
[n8n PR #39637](https://github.com/n8n-io/n8n/pull/39637). They are not included
in this power package.

The subsequent workflow build/run/debug test also passed with assistance, but
exposed a separate [Kiro tool-schema limitation](kiro-tool-schema-compatibility.md).
Successful OAuth alone does not make this power ready to ship.

## Required resolution

The n8n server must support each advertised authentication method or stop
advertising unsupported methods. A Kiro change to register explicitly as a
public client is another candidate to investigate. The local server fix above
has passed Kiro OAuth and read checks, but must be released upstream before the
power can rely on it for existing n8n deployments.

The [Agent Plugins MCP schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json)
does not expose OAuth client-registration options. Do not add unsupported
OAuth properties, embed credentials, or substitute REST/API-key access in this
package. Verify a successful token exchange, MCP read, token refresh/reconnect,
and the remaining workflow scenarios after the client/server fix is available.

## Alternative verified with MCP token authentication

On 2026-09-28, a separate local test connected Kiro with an n8n MCP API key while
the entire OAuth server module was disabled. A skills-only power used the
separately configured MCP connection to create an unpublished workflow, execute
it in manual mode, and read its expected output. This path does not require the
OAuth patch or use the n8n REST API for workflow operations.

See the [token authentication acceptance test](token-auth-acceptance.md) for the
configuration, evidence, and limits. Adopting this path would require changing
the power's connection instructions and packaging. The existing OAuth power
remains unchanged.
