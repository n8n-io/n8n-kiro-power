# n8n power for Kiro

Build, run, and debug [n8n](https://n8n.io) workflows from Kiro using the code in
your workspace. This power connects to the MCP server built into your n8n Cloud
or self-hosted instance with OAuth.

**Release status:** implementation candidate. This package now uses a bundled
setup helper and native Kiro MCP settings with public-client OAuth. The approach
passed real browser sign-in, workflow creation/execution, refresh and reconnect
against local n8n without the OAuth Basic-authentication fix. Cloud verification,
installed-package onboarding, and unaided native workflow repair remain release
gates. It is not ready for registry submission.

See the [acceptance evidence](docs/public-oauth-acceptance.md),
[new helper validation](docs/setup-helper-acceptance.md),
[setup helper guide](docs/setup-helper.md), and
[implementation plan](docs/public-oauth-implementation-plan.md). The earlier
[OAuth failure](docs/oauth-compatibility.md) and
[bundled-power schema issue](docs/kiro-tool-schema-compatibility.md) remain
recorded separately.

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
- **Kiro IDE 1.1.70**, running locally with network access to your instance.
  The helper currently guards to this tested version.
- **Node.js 22+**, available to Kiro when it runs the setup helper.
- An instance owner or admin must enable **Settings > Instance-level MCP**.
- To inspect, run, or change an existing workflow, enable **Available in MCP**
  for that workflow and ensure your n8n user has the necessary permissions.
  Workflow search can show previews of workflows that have not been exposed.
- Workflow builder tools must be enabled. On self-hosted instances, an admin can
  disable them with `N8N_MCP_BUILDER_ENABLED=false`.

The [release checklist](docs/release-checklist.md) records validation status and
the exact versions used for live testing. A compatibility floor is not a claim
that every version has been tested.

## Install and connect

1. Clone/download the candidate branch and use **Kiro > Powers > Add Custom
   Power > Import power from a folder**. Select the folder containing
   `plugin.json`. The default GitHub branch must contain the release before its
   repository URL can be used for the public listing.
2. Ask Kiro to connect to your n8n instance and provide its base URL or full MCP
   endpoint. The connection skill runs its bundled helper; no npm install or
   token copying is needed. An administrator must already have enabled MCP.
3. The helper adds a native user-level MCP connection, shared across projects.
   Request workspace scope if you want only the current project. It preserves
   unrelated settings and reports the configured server name.
4. Select that server under **Kiro > MCP Servers > Authenticate**, sign in to
   n8n, and review consent. Kiro 1.1.70 can request all advertised permissions:
   select **Custom** and choose workflow read/write/execute plus execution read
   for basic workflow tasks. Respect narrower grants when writes are unnecessary.
5. Ask Kiro to perform a read-only workflow search. That confirms the connection;
   a browser success page or a populated configuration alone does not.

To run setup yourself from a checkout:

```sh
node skills/connect-n8n/scripts/setup.mjs configure --url https://YOUR-N8N-HOST --workspace /absolute/path/to/project
```

Use HTTPS except on loopback. Supply the actual URL, preserving a deployment
base path. The helper sets a five-minute connection timeout. If a browser request
expires, use Retry then Authenticate in Kiro to start a fresh flow.

This power has no bundled `mcp.json`; connection settings live in Kiro's native
user or workspace configuration. The installed power's **Open powers config**
control is not the setup path. Updates should preserve native settings, but the
real update/reinstall flow remains an acceptance gate. For an older installation,
verify the new connection before disabling the old bundled server. See
[helper commands, migration and recovery](docs/setup-helper.md).

## Token fallback

If registration or callback policy prevents OAuth, you can explicitly choose an
n8n MCP access token. Open n8n's MCP connection settings and copy your token into
secure local storage or an environment variable available to the Kiro process.
Keep it out of chat and the repository. Configure a separately named native MCP
entry with an Authorization header referencing that variable:

```json
{
  "mcpServers": {
    "n8n-token": {
      "url": "https://YOUR-N8N-HOST/mcp-server/http",
      "headers": { "Authorization": "Bearer ${N8N_MCP_ACCESS_TOKEN}" }
    }
  }
}
```

Approve the variable for expansion in Kiro when prompted. A GUI-launched Kiro
may not inherit terminal variables, and token rotation requires updating its
value. The OAuth helper does not store tokens or adopt this entry. See the
[token acceptance report](docs/token-auth-acceptance.md) for the tested launch
method and its limits. Never paste the actual token into the example.

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

Your workflow data goes between your n8n instance and Kiro. The bundled helper
contacts that instance for OAuth discovery and public-client registration, then
writes local Kiro configuration and nonsecret registration metadata. Kiro handles
browser authorization and stores tokens. The helper adds no proxy, background
service, telemetry or token storage. Restricted local config backups may include
secrets belonging to other MCP entries; do not commit or share those backups.

- [n8n privacy policy](https://n8n.io/legal/privacy/)
- [Kiro data protection](https://kiro.dev/docs/privacy-and-security/data-protection/)

## Support

For this power, [open an issue](https://github.com/n8n-io/n8n-kiro-power/issues).
For n8n product questions, use the [n8n community forum](https://community.n8n.io).

## Licence

[Apache-2.0](LICENSE)
