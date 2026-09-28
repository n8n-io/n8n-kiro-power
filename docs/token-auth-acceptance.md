# MCP token authentication acceptance test

Tested locally on 2026-09-28. Kiro connected to n8n with an MCP access token
without using the OAuth server. A skills-only power used that separate MCP
connection.

## Configuration tested

- Kiro IDE application version: 1.1.70.
- Installed Kiro agent extension version: 1.1.158.
- n8n development build: 2.41.0.
- Server: a fresh SQLite instance bound to `127.0.0.1:5685`.
- Authentication: an MCP API key issued to a disposable local test account.
- Kiro configuration: workspace `.kiro/settings/mcp.json`.
- Power: local test copy named `n8n-token-proof`, with three skills and no
  bundled `mcp.json`.

The server ran with `N8N_DISABLED_MODULES=oauth-server` to make the test
independent of the OAuth patch. OAuth discovery and token endpoints returned
404. **This setting is a test control, not a requirement or recommendation for
normal token setup.**

The workspace used this configuration:

```json
{
  "mcpServers": {
    "n8n-token-acceptance": {
      "url": "http://localhost:5685/mcp-server/http",
      "headers": {
        "Authorization": "Bearer ${N8N_MCP_ACCESS_TOKEN}"
      }
    }
  }
}
```

Kiro was launched with the test token in its environment. The token was not
stored in the workspace configuration, sent in a prompt, or committed. A real
installation must supply the variable to the Kiro process on each launch.

## Results

| Check | Result |
| --- | --- |
| MCP connection and tool discovery | Kiro showed Connected with 54 tools |
| Actual `search_workflows` call | Passed; returned `{"data":[],"count":0}` |
| Reload Window and repeat the call | Passed with the same result |
| Power import | Kiro installed the local skills-only power |
| Power activation and skill loading | Passed for `connect-n8n` and `build-workflow` |
| Workflow validation and creation through Kiro | Passed; three-node unpublished workflow |
| Real manual execution through Kiro | Passed; execution `1` reported `success` |
| Execution output read through Kiro | Passed; returned `{"message":"KIRO","doubled":14}` |
| Request without a token | Rejected with HTTP 401 |
| Request with an invalid token | Rejected with HTTP 401 |

The server trace recorded Bearer authentication and HTTP 200 for Kiro's
discovery and tool calls. It logged method names and status codes, never token
values. The OAuth 404 checks and token rejection checks were separate direct
probes; Kiro did not perform an OAuth flow.

The workflow was `Kiro Token Acceptance Test`, ID `mcEpd8YcqtXDDFty`:

```text
Manual Trigger -> Sample Input (Set) -> Transform (Set)
```

`Sample Input` supplies the literal values `message="kiro"` and `count=7`.
`Transform` converts the message to uppercase and doubles the count. Execution
`1` ran in manual mode without pinned data. Kiro retrieved the saved execution
through `get_workflow_execution` with `includeData: true` and confirmed the
expected output. The workflow remains unpublished and has no credentials or
external effects. No extra schema file was supplied for this creation test.

## Power packaging

The test copy retains the workflow-building and debugging skills. Its
connection skill uses the separately configured `n8n-token-acceptance` MCP
server. The original OAuth power and the repository's shipped `mcp.json`
remain unchanged.

This separates per-user authentication from the distributable power. Agent
Plugins permits fixed remote headers, but forbids secrets and environment
expansion in those headers. Kiro's ordinary MCP configuration supports the
environment reference used above.

## Limits

This test covers the local development instance. It does not establish a live
connection to n8n Cloud 2.39.6, a GitHub power import, a registry listing, or a
connection after a full application restart without supplying the token again.
Token rotation, workflow update operations, and external integrations were not
part of this test. It does not establish that the original bundled-power schema
limitation is fixed.

Sources: [n8n MCP setup](https://github.com/n8n-io/n8n-docs/blob/main/docs/connect/connect-to-n8n-mcp-server.md),
[Kiro MCP configuration](https://kiro.dev/docs/mcp/configuration/),
[skills-only powers](https://kiro.dev/docs/powers/create/), and
[Agent Plugins specification](https://agent-plugins.org/specification).
