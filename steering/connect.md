# Connecting to n8n

Run this check on the first turn of a new conversation in this power, before any
n8n tool call. Do not skip it because the config file looks populated.

## Pre-flight

**A populated `mcp.json` does not prove a working connection.** It proves a file
was written. The URL comes from an environment variable and the auth comes from a
browser flow, so both can be missing while the config looks correct.

Before you use any n8n tool, confirm all three:

1. **The server is listed.** If the `n8n` MCP server is not in your available
   tools, the power is installed but the server did not start.
2. **The URL resolved.** `${N8N_MCP_URL}` must expand to a real host. If it is
   empty or literal, the connection fails at DNS, not at auth.
3. **A tool call succeeds.** Call `search_workflows` with no filter. It is cheap,
   read-only, and it fails in a way that tells you which of the two problems above
   you have.

If step 3 succeeds, say so once and continue. Do not repeat the check later in the
same conversation.

## When the URL is not set

Tell the user to set it and say where to find it. Do not guess a URL and do not
try other hosts.

```bash
export N8N_MCP_URL="https://your-instance.app.n8n.cloud/mcp-server/http"
```

The value is in n8n under **Settings > Instance-level MCP > Connection details**.
Self-hosted instances use the same `/mcp-server/http` path on their own host.

The environment variable must be set where Kiro can read it, so the user may need
to restart Kiro after they set it.

## When the connection is refused or times out

Work through these in order and report what you find:

- **MCP access is off on the instance.** Settings > Instance-level MCP has a
  toggle. This is the most common cause.
- **The instance is not reachable from this machine.** Self-hosted instances
  behind a VPN or a private network need the tunnel up first.
- **The URL is missing the path.** The base host alone is not the endpoint. It
  must end in `/mcp-server/http`.

## When authorization fails

n8n uses OAuth 2.1 with dynamic client registration. Kiro registers itself and
opens a browser. There is no API key to paste, so an auth failure is not a missing
token.

- **The browser window did not open or was closed.** Ask the user to retry the
  connection.
- **A tool the user expected is absent.** That is a scope problem, not a bug. The
  granted scopes decide which tools are listed. Ask the user to reconnect and
  approve the scope that covers the tool they want.
- **A call returns 401 after working earlier.** The grant was revoked or expired.
  Stop calling tools and ask the user to reconnect. Do not retry the failed call.

## What not to do

- Do not report the power as working because the config file exists.
- Do not fall back to the n8n REST API or an API key. This power uses MCP only.
- Do not try to enable MCP access on the instance yourself. It is an instance
  setting and the user has to make that decision.
