# n8n power for Kiro

Build, run, and debug [n8n](https://n8n.io) workflows using the routes and types
in your editor workspace. The power connects to your own n8n instance through
its built-in MCP server. Workflows remain editable and runnable without Kiro.

**Status: draft candidate.** Public-client OAuth is verified end to end against
both a local and a cloud instance, from an installed power, through Kiro
authorization to a successful workflow read. The build, test, and repair loops
still require acceptance testing. See the
[release checklist](docs/release-checklist.md).

## Requirements

- **Kiro IDE 1.1.70**, in a local session. Setup currently accepts this version only.
- **Node.js 22+**, available to commands run by Kiro.
- **n8n 2.34.0+** for the workflow tool names. This is not a verified public-OAuth
  version floor; live testing used n8n 2.41.0 development.
- An owner/admin must enable **Settings > Instance-level MCP**. Workflow builder
  tools must also be enabled; self-hosted admins can disable them with
  `N8N_MCP_BUILDER_ENABLED=false`.
- Existing workflows need **Available in MCP** enabled and appropriate user
  access for inspection, execution, or editing. Search previews may include
  workflows that have not been exposed.

The power covers workflows, including AI Agent nodes. Standalone n8n Agents
are a separate Preview feature and are outside this release.

## Install and connect

1. For the draft, check out PR #1's `initial-power` branch. In **Kiro > Powers >
   Add Custom Power > Import power from a folder**, select the directory
   containing `plugin.json`. GitHub installation from the repository URL becomes
   the release path after the package is merged to `main`.
2. Ask Kiro to connect to n8n and give it your instance base URL or full MCP URL.
   The connection skill runs the bundled helper. No npm install, token copying,
   or JSON editing is needed on this path.
3. The helper creates a native user-level MCP connection shared across projects.
   Request workspace scope to configure only the current project.
4. Under **Kiro > MCP Servers**, select the named server and **Authenticate**.
   Sign in to n8n and review consent. Kiro 1.1.70 may request all advertised
   permissions: choose **Custom**, then workflow read/write/execute and execution
   read for basic workflow tasks. Use narrower grants for read-only tasks.
5. Ask Kiro to search for a workflow. A successful read verifies the connection;
   a browser success page alone does not.

For manual setup from this checkout:

```sh
node skills/connect-n8n/scripts/setup.mjs configure --url "<your n8n URL>"
```

Replace the angle-bracket value. Use HTTPS except on loopback, and preserve any
deployment base path. The default is a user-level connection shared across
projects. For a project-only connection pass both flags, since `--workspace`
alone still writes user settings:

```sh
node skills/connect-n8n/scripts/setup.mjs configure --url "<your n8n URL>" --scope workspace --workspace "<absolute project path>"
```

Settings live in Kiro's native configuration; this power ships no root
`mcp.json`.
See the [setup guide](docs/setup-helper.md) for repair, removal, and migration.

## Token fallback

If OAuth registration or callback policy prevents setup, you can explicitly
choose an n8n MCP access token. Copy it from n8n's MCP connection settings into
an environment variable available to Kiro, keeping the value out of chat and
the repository. Add a separately named native MCP entry:

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

Approve variable expansion in Kiro when prompted. A GUI-launched Kiro may not
inherit terminal variables; restart it with the variable available after token
rotation. The OAuth helper does not manage tokens or adopt this entry.

## Using the power

- `connect-n8n` checks the intended instance, connection, and access.
- `build-workflow` uses workspace context to create and test workflows.
- `debug-execution` investigates execution data and applies grounded repairs.

The server supplies tool schemas and SDK instructions. Missing tools can reflect
version, enabled features, licensing, OAuth permissions, or user access. Creating
or editing a draft does not publish it. Real executions can affect external
systems; simulated tests do not prove those integrations work.

## Privacy and support

Workflow data goes between Kiro and your n8n instance. The helper makes discovery
and public-client registration requests, then writes local configuration and
nonsecret registration metadata. Kiro handles browser authorization and tokens.
The helper adds no proxy, background service, telemetry, or token storage.
Local configuration backups can contain secrets from other MCP entries; do not
commit or share them.

- [n8n privacy policy](https://n8n.io/legal/privacy/)
- [Kiro data protection](https://kiro.dev/docs/privacy-and-security/data-protection/)
- [Power support and issues](https://github.com/n8n-io/n8n-kiro-power/issues)
- [n8n community support](https://community.n8n.io)

[Apache-2.0 license](LICENSE)
