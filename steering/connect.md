# Connecting to n8n

Run this check on the first turn of a new conversation in this power, before any
n8n tool call. Do not skip it because the config file looks populated.

## Pre-flight

**A populated `mcp.json` does not prove a working connection.** It proves a file
was written. The URL comes from an environment variable and the auth comes from a
browser flow, so both can be missing while the config looks correct.

Before you use any n8n tool, confirm all three:

1. **The server is listed.** If the `n8n` server does not appear in your
   available tools, the power is installed but the server did not start.
2. **The URL is a real host.** The shipped entry has the placeholder
   `YOUR-N8N-HOST`. If that is still there, it was never configured.
3. **A tool call succeeds.** Call `search_workflows` with no filter. It is cheap,
   read-only, and it fails in a way that tells you which of the two problems above
   you have.

If step 3 succeeds, say so once and continue. Do not repeat the check later in the
same conversation.

## When the URL is not configured

The usual symptom is that the server is listed but reports
**"(No tools available)"**. That means it did not connect, not that the instance
is empty.

Tell the user to replace `YOUR-N8N-HOST` in the power's `mcp.json` with their own
host, then reconnect.

**Do not guess the host and do not try other hosts.** Every instance has a
different one and there is no default worth attempting. Only the path is fixed:
the endpoint is always the instance's base URL followed by `/mcp-server/http`.

The full URL is in n8n under
**Settings > Instance-level MCP > Connection details**.

**Do not suggest an environment variable.** Variable references in a power's
`mcp.json` are not reliably expanded, even when the variable is set and approved
([kirodotdev/Kiro#11258](https://github.com/kirodotdev/Kiro/issues/11258)). The
direct edit is the supported path. In particular, adding the variable to
`~/.zshrc` does nothing for a GUI launch on macOS, because the app inherits from
launchd rather than reading shell startup files.

## When Kiro cannot reach the host

Kiro has to reach the host from wherever it is running, and that is not always
the user's machine. A Kiro cloud session runs remotely, so an instance that only
resolves on the user's own network is unreachable from it, and `localhost` points
at the remote machine rather than theirs.

Check this before you debug anything else, because it looks like a plain network
failure. Say it plainly rather than retrying the connection.

## When the connection is refused or times out

Work through these in order and report what you find:

- **MCP access is off on the instance.** Settings > Instance-level MCP has a
  toggle. This is the most common cause.
- **The URL is missing the path.** The base host alone is not the endpoint. It
  must end in `/mcp-server/http`.
- **Kiro cannot reach the host.** See the section below.

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
