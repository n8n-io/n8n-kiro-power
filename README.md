# n8n power for Kiro

Build, run, and debug [n8n](https://n8n.io) workflows in your own n8n instance,
from Kiro, wired to the code in your workspace.

This power connects Kiro to the MCP server built in to every n8n instance. The
agent can create workflows, test them, read execution history to debug a failure,
and inspect what is already on the instance.

## Requirements

- An n8n instance, cloud or self-hosted, reachable from your machine
- MCP access turned on in that instance, under
  **Settings > Instance-level MCP**
- Kiro

## Install

**1. Set your instance URL.**

```bash
export N8N_MCP_URL="https://your-instance.app.n8n.cloud/mcp-server/http"
```

Find the exact URL in n8n under **Settings > Instance-level MCP > Connection
details**. Self-hosted instances use the same `/mcp-server/http` path on their own
host.

Set this before you install, so the server connects on the first try. If you
cannot use an environment variable, replace `${N8N_MCP_URL}` in `mcp.json` with
the URL after you install.

**2. Install the power.** In Kiro, open the Powers panel, choose
**Import power from GitHub**, and enter:

```
https://github.com/n8n-io/n8n-kiro-power
```

**3. Approve access.** Kiro opens a browser window. n8n shows a consent screen
listing the scopes Kiro is asking for. Approve the ones you want.

There is no API key and no token to paste. n8n uses OAuth 2.1 with dynamic client
registration, so Kiro registers itself.

## Scopes

Start with these:

| Scope | What it allows |
|---|---|
| `workflow:read` | Read workflows, search nodes, validate |
| `workflow:write` | Create and update workflows |
| `workflow:execute` | Test a workflow the agent built |
| `execution:read` | Read execution history to debug a failure |
| `credential:read` | Reuse a credential you already have |

Approve more only when you need them. `communityPackage:install` is disabled in
this power's `mcp.json` by default, because installing packages changes what the
whole instance can run.

You can change the grant at any time by reconnecting, or revoke it in n8n under
**Settings > Instance-level MCP**.

## What the agent can do

The agent acts on your instance with the scopes you approved. That includes
creating, updating, and executing workflows, and publishing them if you approve
`workflow:write`.

**Point this at a development instance first.** Publishing a workflow with a
schedule or a webhook starts real work against real systems.

## Privacy

Your workflow data goes between your n8n instance and Kiro. This power adds no
service in between: it is configuration and instructions only, and it stores
nothing.

- [n8n privacy policy](https://n8n.io/legal/privacy/)
- Kiro's handling of MCP traffic is covered by AWS's terms for Kiro.

## Support

Open an issue on this repository:
[github.com/n8n-io/n8n-kiro-power/issues](https://github.com/n8n-io/n8n-kiro-power/issues)

For questions about n8n itself rather than this power, the
[n8n community forum](https://community.n8n.io) is the better place.

## Licence

[Apache-2.0](LICENSE)
