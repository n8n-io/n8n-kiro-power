# n8n power for Kiro

Build, run, and debug [n8n](https://n8n.io) workflows from Kiro using the code in
your workspace. This power connects to the MCP server built into your n8n Cloud
or self-hosted instance with OAuth.

**Release status:** live testing with Kiro 1.1.70 reached browser authorization,
but the MCP token exchange failed. The tested instance advertises an OAuth
client-authentication method its token endpoint rejects. See the
[compatibility blocker and reproduction](docs/oauth-compatibility.md).
End-to-end workflow operation is not yet verified.

## What it does

- **Build workflows** with the n8n Workflow SDK, node discovery, and validation.
- **Test workflow logic** with simulated external inputs and report what remains
  unverified. Run real integrations when you authorize their effects.
- **Debug failures** from execution data and workflow version history.
- **Inspect available resources** such as workflows, credentials, projects,
  folders, tags, and data tables. Availability depends on your instance and access.

Kiro can read the route definitions and types in your repository. It can use
those to match a workflow's requests to the application you are developing.
Workflows remain normal n8n workflows that you can edit and run without Kiro.

The skills cover workflows, including workflows with AI Agent nodes. Standalone
n8n Agents are a separate [Preview feature](https://docs.n8n.io/connect/connect-to-n8n-mcp-server#exposing-agents-to-mcp-clients)
and are outside this power's release scope.

## Requirements

- **n8n 2.34.0 or later**, using a current stable patch release. This is the
  compatibility floor for the tool names used by these skills. Earlier versions
  use different execution tool names. See the [MCP tool reference](https://docs.n8n.io/connect/connect-to-n8n-mcp-server/mcp-server-tools-reference).
- Kiro IDE with Agent Plugins support and network access to your instance.
- An instance owner or admin must enable **Settings > Instance-level MCP**.
- To inspect, run, or change an existing workflow, enable **Available in MCP**
  for that workflow and ensure your n8n user has the necessary permissions.
  Workflow search can show previews of workflows that have not been exposed.
- Workflow builder tools must be enabled. On self-hosted instances, an admin can
  disable them with `N8N_MCP_BUILDER_ENABLED=false`.

The [release checklist](docs/release-checklist.md) records validation status and
the exact versions used for live testing. A compatibility floor is not a claim
that every version has been tested.

## Install

Use a local folder so you can set your instance URL before Kiro imports the
power. The URL is different for each user.

**1. Get the power.** Clone this repository or download and extract it:

```sh
git clone https://github.com/n8n-io/n8n-kiro-power.git
```

For an unmerged PR, check out its branch before you continue.

**2. Copy your MCP URL.** In n8n, open **Settings > Instance-level MCP >
Connection details > Connect**. Choose OAuth and copy the full **Server URL**.
It ends in `/mcp-server/http`. See the [n8n connection guide](https://docs.n8n.io/connect/connect-to-n8n-mcp-server).

**3. Configure the folder.** Open `mcp.json` at the root of the downloaded
`n8n-kiro-power` folder, next to `plugin.json`. Replace the entire placeholder URL
with the copied value:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "n8n": {
      "type": "streamable-http",
      "url": "https://YOUR-N8N-HOST/mcp-server/http"
    }
  }
}
```

Use HTTPS except for a loopback address such as `http://localhost:5678`.
Do not put tokens or passwords in this file. Agent Plugins requires a literal
URL and does not expand environment variables in this field.

**4. Import the configured folder.** In Kiro, open **Powers > Add Custom Power >
Import power from a folder** and select the folder containing `plugin.json`.
This follows Kiro's [local installation procedure](https://kiro.dev/docs/powers/installation/).
Agent Plugins MCP servers are managed internally by Kiro; they do not appear in
the user-level `~/.kiro/settings/mcp.json`.

**5. Connect and authorize.** Ask Kiro to connect to n8n to activate the power.
In the **Kiro** sidebar, expand **MCP Servers**. If the power's n8n server shows
**Unauthenticated**, choose **Authenticate**. Allow Kiro to open your n8n
authorization page, complete the browser sign-in, and review the requested
permissions. Then ask Kiro to search for a workflow. A successful read confirms
the connection. This power uses OAuth; it does not require an API key or token
to be pasted.

In Kiro 1.1.70, activation alone reported **No tools available** and logged
**Unauthorized** until **Authenticate** was selected. That control started the
OAuth browser flow. Do not treat either message as evidence that your instance
has no workflows.

If the browser says the authorization request expired or was already completed,
close that page and retry from Kiro. In this test Kiro stopped waiting after
60 seconds. Select **Retry** if the connection failed, then **Authenticate**
when you are ready to complete the browser flow. Use the newly opened page.

For an already installed power, including one imported from GitHub, open
**Powers > n8n > Open powers config** to open its installed `mcp.json`. Set your
Server URL there and save, then reconnect through **MCP Servers**. This avoids
guessing Kiro's internal installation directory. The button and file location
were verified in Kiro 1.1.70; authenticated reconnection and GitHub installation
remain on the [release checklist](docs/release-checklist.md).

If you change your instance URL, edit the same local folder and import it again.
The imported package is a separate copy. After an update or reinstall, open
**Open powers config** and confirm that it still contains your intended host;
do not assume edits to the installed copy survive an update.

A Kiro cloud session runs remotely. It cannot reach an instance that is only
available on your local network; `localhost` would refer to that remote machine.

## Access and troubleshooting

Your OAuth grant limits the tools Kiro can use. Your n8n version, enabled
features, license, user permissions, and each workflow's MCP setting also limit
what is available. A missing tool does not always mean you withheld a permission.

- **No tools:** check the configured URL, MCP status, network reachability, and
  OAuth connection error. Do not assume the instance has no workflows.
- **A tool is missing:** check the version and feature availability before
  reconnecting to change permissions. Folder tools require the folders feature;
  disabled workflow tags also remove the tag tool.
- **A workflow appears in search but cannot be opened:** check its **Available
  in MCP** setting and your n8n user's access.
- **A previously working call returns 401:** stop and reconnect. The token may
  have expired or access may have been revoked.

You can review or revoke OAuth access under **Settings > Instance-level MCP >
Connected clients**. Start with a development instance. Real executions and
publishing can affect external systems. Creating or editing a draft does not
prove that the published workflow has changed.

## Skills

| Skill | Loads when |
|---|---|
| `connect-n8n` | First use, or when connection or access fails |
| `build-workflow` | Creating or changing a workflow |
| `debug-execution` | A workflow failed or started behaving differently |

The server supplies the SDK and build instructions. These skills add workspace
context, connection checks, test interpretation, and a debugging process.

## Privacy

Your workflow data goes between your n8n instance and Kiro. This power adds no
intermediate service: it contains configuration and instructions only.

- [n8n privacy policy](https://n8n.io/legal/privacy/)
- [Kiro data protection](https://kiro.dev/docs/privacy-and-security/data-protection/)

## Support

For this power, [open an issue](https://github.com/n8n-io/n8n-kiro-power/issues).
For n8n product questions, use the [n8n community forum](https://community.n8n.io).

## Licence

[Apache-2.0](LICENSE)
