# n8n power for Kiro

Build, run, and debug [n8n](https://n8n.io) workflows in your own n8n instance,
from Kiro, wired to the code in your workspace.

This power connects Kiro to the MCP server built in to every n8n instance. The
agent can create workflows, test them, read execution history to debug a failure,
and inspect what is already on the instance.

## What it does

- **Build workflows** with the n8n Workflow SDK, including node discovery, type
  definitions, and validation before saving
- **Run and test**, so a build is verified and not only written
- **Debug**: search execution history, open a failed run, find the node that
  failed
- **Inspect the instance**: workflows, projects, folders, tags, credentials, and
  data tables
- **Build Agents**: create and call first-class n8n Agents, when the instance has
  them enabled
- **Version control**: read workflow history, compare versions, restore one

The reason to run this in an editor rather than a chat client is the workspace.
The agent reads your code, so it can wire a webhook to the endpoint you are
actually writing, and match a request body to the type in your repo.

## Requirements

- An n8n instance that Kiro can reach
- MCP access turned on in that instance, under
  **Settings > Instance-level MCP**
- Kiro

## Install

**1. Install the power.** In Kiro, open the Powers panel, choose
**Import power from GitHub**, and enter:

```
https://github.com/n8n-io/n8n-kiro-power
```

**2. Point it at your instance.** Edit `mcp.json` and replace the placeholder
host:

```json
"url": "https://YOUR-N8N-HOST/mcp-server/http"
```

`/mcp-server/http` is the same on every instance. Only the host changes, and it
is different for every user, so there is no default that could work here.

Copy the full URL from n8n under **Settings > Instance-level MCP > Connection
details**.

The URL goes in the file rather than an environment variable because variable
references in a power's `mcp.json` are not reliably expanded
([kirodotdev/Kiro#11258](https://github.com/kirodotdev/Kiro/issues/11258)). The
URL is not a secret: it is the address of your instance, and access is controlled
by OAuth.

**3. Approve access.** Kiro opens a browser window. n8n shows a consent screen
listing what Kiro is asking for. Grant what you want.

There is no API key and no token to paste. n8n uses OAuth 2.1 with dynamic client
registration, so Kiro registers itself.

Kiro has to be able to reach the host you set. A Kiro **cloud session** runs on a
remote machine, so an instance that only resolves on your own network is not
reachable from one.

## What the agent can do

You decide that on the consent screen. Which tools appear follows from what you
granted, so a tool that is missing was simply not granted.

You can change the grant at any time by reconnecting, or revoke it in n8n under
**Settings > Instance-level MCP**.

**Point this at a development instance first.** If you grant write and execute,
the agent can create, update, run, and publish workflows. A published workflow
with a schedule or a webhook starts real work against real systems.

## Skills

| Skill | Loads when |
|---|---|
| `connect-n8n` | First use, or when the connection or authorization fails |
| `build-workflow` | Creating or changing a workflow |
| `debug-execution` | A workflow failed or started behaving differently |

The skills deliberately do not restate the MCP server's own build instructions.
The server sends those when it connects, so a copy here would drift. The skills
cover what the server cannot know: whether the connection is real, what is in
your workspace, and how to triage a failed run.

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
