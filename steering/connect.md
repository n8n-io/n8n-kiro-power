# Connecting to n8n

Run this check on the first turn of a new conversation in this power, before any
n8n tool call. Do not skip it because the config file looks populated.

## Pre-flight

**A populated `mcp.json` does not prove a working connection.** It proves a file
was written. The URL comes from an environment variable and the auth comes from a
browser flow, so both can be missing while the config looks correct.

This power ships two server entries: `n8n` for a cloud or remote instance, and
`n8n-local` for a self-hosted instance on the default port. Exactly one should be
active.

Before you use any n8n tool, confirm all three:

1. **A server is listed.** If neither `n8n` nor `n8n-local` appears in your
   available tools, the power is installed but no server started.
2. **The URL is a real host.** The shipped `n8n` entry has a placeholder,
   `YOUR-INSTANCE.app.n8n.cloud`. If that is still there, it was never configured.
3. **A tool call succeeds.** Call `search_workflows` with no filter. It is cheap,
   read-only, and it fails in a way that tells you which of the two problems above
   you have.

If step 3 succeeds, say so once and continue. Do not repeat the check later in the
same conversation.

## When the URL is not configured

The usual symptom is that the server is listed but reports
**"(No tools available)"**. That means it did not connect, not that the instance
is empty.

Tell the user to edit the power's `mcp.json` directly and then reconnect. Do not
guess a URL and do not try other hosts.

- **Self-hosted on the default port**: set `"disabled": false` on the
  `n8n-local` entry. Nothing else to change.
- **Anything else**: replace the placeholder in the `n8n` entry with the real
  URL, and leave `n8n-local` disabled.

Find the URL in n8n under **Settings > Instance-level MCP > Connection details**.
It ends in `/mcp-server/http`.

**Do not suggest an environment variable.** Variable references in a power's
`mcp.json` are not reliably expanded, even when the variable is set and approved
([kirodotdev/Kiro#11258](https://github.com/kirodotdev/Kiro/issues/11258)). The
direct edit is the supported path. In particular, adding the variable to
`~/.zshrc` does nothing for a GUI launch on macOS, because the app inherits from
launchd rather than reading shell startup files.

## In a cloud session

A Kiro cloud session runs on a remote machine. Check this before you debug
anything else, because the failure looks like a network problem.

**`localhost` is not the user's machine.** A local n8n instance is unreachable
from a cloud session, so `n8n-local` cannot work there. The instance has to be one
the internet can resolve. Say this plainly rather than retrying the connection.

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
