# OAuth compatibility blocker

On 2026-09-25, Kiro IDE 1.1.70 imported and activated this power, but could not
complete an MCP connection to the tested n8n Cloud instance. The browser showed
**Authorization Successful**; Kiro subsequently reported a missing `client_id`.
This blocks release verification. No MCP read, workflow change, or execution
succeeded. The user confirmed the instance runs n8n Cloud **2.39.6**.

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
Together with the matching endpoint error, this strongly indicates an OAuth
client-authentication mismatch. The actual Kiro token request was not captured;
no saved client secrets or tokens were inspected.

## Required resolution

The n8n server must support each advertised authentication method or stop
advertising unsupported methods. A Kiro change to register explicitly as a
public client is another candidate to investigate. Neither fix has been
implemented or verified by this power PR.

The [Agent Plugins MCP schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json)
does not expose OAuth client-registration options. Do not add unsupported
OAuth properties, embed credentials, or substitute REST/API-key access in this
package. Verify a successful token exchange, MCP read, token refresh/reconnect,
and the remaining workflow scenarios after the client/server fix is available.
