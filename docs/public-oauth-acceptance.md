# Public-client OAuth acceptance and connection UX

Test date: 2026-09-28. Kiro IDE 1.1.70, agent extension 1.1.158.

## Test setup

The test used a separate n8n 2.41.0 development instance on loopback port 5689.
The instance had a disposable owner account, SQLite database, and MCP enabled.
It did not use the OAuth Basic-authentication middleware from PR #39637.

The runtime snapshot used the existing compiled CLI. It removed the middleware
import and both router registrations added by that PR. It also removed the
compiled middleware files. The corresponding source baseline is commit
`8ccb6cd0a0529e5a10106d72c1fa0e7e838f58fb`. The working n8n checkout was unchanged.
A control request with Basic authentication returned HTTP 400 for a missing
`client_id`, reproducing the original failure on this same server.

A test setup script registered a client with
`token_endpoint_auth_method: "none"`. n8n returned a client ID and no client
secret. The script wrote an ordinary Kiro MCP configuration:

```json
{
  "mcpServers": {
    "n8n-public-oauth": {
      "url": "http://localhost:5689/mcp-server/http",
      "timeout": 300000,
      "oauth": {
        "clientId": "<ID returned by registration>",
        "redirectUri": "localhost:5693"
      },
      "oauthScopes": [
        "workflow:read",
        "workflow:write",
        "workflow:execute",
        "execution:read"
      ]
    }
  }
}
```

The registered redirect URI was `http://localhost:5693/oauth/callback`.
There was no bearer header, token environment variable, client secret, or proxy.

The initial protocol tests used a fixture harness to sign in to the disposable
account through REST and supply consent for Kiro's actual PKCE request. The
harness returned the authorization code to Kiro's own callback. Kiro performed
the token exchange and all MCP calls.

A follow-up test completed the real sign-in and consent pages in the Codex
browser using the disposable account's existing credentials. It selected the
same four scopes through the Custom permission controls and confirmed Kiro's
localhost callback. The browser displayed Authorization Successful. Kiro's
PKCE exchange and MCP discovery returned HTTP 200, and Kiro showed 23 connected
tools. No REST consent harness was used in this browser test.

## Confirmed results

| Check | Observed result |
| --- | --- |
| Public client registration | HTTP 201; no client secret |
| Kiro authorization request | Authorization code with S256 PKCE |
| Kiro token exchange | HTTP 200; client ID and verifier in the body; no Basic header |
| Browser sign-in and consent | Passed through the real n8n UI; four scopes selected; callback succeeded |
| MCP discovery | Connected with 23 tools under four approved scopes |
| Reload Window | Reconnected with stored credentials |
| Close and reopen the test workspace | Reconnected with stored credentials |
| Power activation | Existing skills-only test power activated; build-workflow skill loaded |
| Actual workflow search | `{"data":[],"count":0}` |
| Access-token revocation | The next tool call returned HTTP 401 |
| Automatic refresh and retry | Refresh returned HTTP 200; the same node-search call then succeeded |
| Workflow validation | Valid; three nodes |
| Workflow creation and execution through Kiro | Passed; unpublished workflow, real manual execution |
| Execution output retrieved through Kiro | `{"message":"KIRO","doubled":14}` |
| Repeat setup | Reused the registration; client count stayed at one; config bytes were unchanged |
| Revoke access and refresh tokens | MCP returned HTTP 401; refresh returned HTTP 400; Kiro opened fresh browser authorization |
| Complete fresh authorization | PKCE exchange returned HTTP 200; original workflow search resumed and returned one workflow |
| Fresh workflow after browser consent | Power activation, validation, creation, manual execution, and result retrieval passed; execution `2` returned `KIRO` / `14` |

Kiro created workflow `uuK8LuvmH2SPC2LA`, named
`Kiro Public OAuth Acceptance Test`. Execution `1` completed successfully.
The saved graph was `Manual Trigger -> Set -> Set 1`. The first Set node supplied
the literal input. The second Set node produced the expected output. All three
nodes ran; the workflow had no credentials or external integrations and remained
unpublished. The SDK used default Set-node names despite the requested display
names. No extra tool-schema file was supplied for this test.

After completing browser sign-in and consent, Kiro activated the same
skills-only power again and loaded its build-workflow skill. It created a new
workflow, `GQndlaIr7CTcAZK1`, named `Kiro Browser OAuth Acceptance Test`.
Validation returned `valid: true`, with three nodes and no warnings. Execution
`2` succeeded in 22 ms. Kiro retrieved the full execution result through MCP:

```json
{"message":"KIRO","doubled":14}
```

The n8n execution UI independently showed execution `2` as succeeded. The
workflow remained unpublished, with no credentials or stored pin data. The
execution record included an empty Manual Trigger item in its runtime
`pinData`; both Set transformations executed successfully and had no pinned
outputs. No external service was simulated or called. Kiro's first attempt
hit an Auto-model high-traffic error before any n8n tool ran; retrying succeeded.

Reloading the Kiro test window after this run reconnected with the stored OAuth
credentials and 23 tools. The server trace showed successful MCP discovery and
tool listing, with no new authorization request or token exchange.

The refresh test revoked only the disposable access token through n8n's
revocation endpoint. It preserved the refresh token. Kiro sent the client ID
in the refresh request body and did not send a client secret. The interrupted
node search succeeded about 21 seconds after the initial HTTP 401. This tests
recovery from a rejected access token, not natural expiration after one hour.

The second recovery test revoked both tokens. Kiro started a new browser flow
without a configuration change or new client registration. The same fixture
harness supplied consent. Kiro then retried the original search successfully.
The server trace establishes these steps. The agent's initial interpretation
of a successful tool result missed the authentication work in the transport;
the test chat was corrected with the trace evidence.

## Setup details that affect the UX

The installed Kiro build parses its callback setting as a string ending in
`:port`. Its implementation does not parse a full callback URL with a path.
The test used `localhost:5693` in Kiro and the full callback URL in registration.
The current documentation describes broader URI support. A setup helper must
account for the installed client version and choose an available port.

Kiro requested all 16 scopes advertised by the instance, despite the four
configured scopes. The consent UI defaulted to All. Selecting Custom cleared
the selection and allowed exactly the four workflow/execution scopes to be
chosen. n8n stored those four scopes and exposed 23 tools. Do not promise that
`oauthScopes` restricts this build's consent request. A user must be able to
review and choose permissions.

The initial configuration used Kiro's default 60-second connection timeout.
That deadline includes waiting for browser authentication, and requests timed
out while the user was signing in. The local test configuration now uses
`"timeout": 300000` (five minutes), and Kiro's timeout message confirmed the
new deadline. This is a Kiro setting; it does not require an n8n change. A setup
helper should provide enough time for sign-in and a clear retry action.

The test setup script reused its saved registration on a repeated run. A
shipping helper should also reuse the client ID, preserve unrelated MCP
settings, and provide a repair path for invalid registrations and occupied
callback ports. The test script is a fixture, not a shipped installer.

## Comparison

| Aspect | Public OAuth with a setup helper | MCP access token |
| --- | --- | --- |
| User setup | Enter instance URL, authenticate in Kiro, sign in and approve permissions | Open n8n MCP settings, copy the token, configure secure storage or the environment |
| Secret handling | Kiro stores OAuth credentials | User or installer must supply the token to Kiro |
| Ongoing access | Kiro can refresh automatically; rejected-token recovery passed | Fewer protocol steps; rotation requires replacing the token |
| Extra running software | None | None with native headers |
| Setup code to maintain | Registration, callback-port selection, config merge, repair | Token entry and storage; no OAuth callback or registration |
| Failure points | Registration policy, browser callback, client version behavior | Missing environment variable, revoked token, token rotation |
| Power packaging | Skills-only power plus native per-user MCP configuration | Same architecture; secrets do not belong in the distributable package |

Public OAuth is the better onboarding design when its setup is automated.
Token authentication has fewer protocol dependencies and remains a useful
fallback. Neither approach requires changes to n8n's OAuth implementation.

Both approaches still require an administrator to enable instance-level MCP.
A setup helper should detect that prerequisite and link to n8n's settings.

## Limits

The live tests use local n8n 2.41.0. The `n8n@2.39.6` source tag also contains
public-client registration and full PKCE/refresh tests. That source evidence
does not establish a successful connection to a particular Cloud instance.
Windows, Linux, SSO, a full IDE application restart, natural token expiration,
callback-port collisions, registry installation, and a production setup helper
were not verified. The package has since moved to a bundled setup helper and native MCP
configuration. The results above predate that implementation and must not be
read as acceptance of the new installer. Its remaining checks are tracked in the
[implementation plan](public-oauth-implementation-plan.md).

See the [token acceptance report](token-auth-acceptance.md) for the independently
verified token path. See [Kiro's OAuth configuration documentation](https://kiro.dev/docs/mcp/configuration/#oauth-configuration)
and the [Agent Plugins MCP configuration rules](https://agent-plugins.org/specification#72-mcp-servers)
for the distinction between native per-user settings and packaged MCP settings.
