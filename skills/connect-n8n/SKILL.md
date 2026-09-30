---
name: connect-n8n
description: "Set up and verify the n8n MCP connection before using n8n tools. Run on the first turn touching n8n, or when tools are missing, OAuth fails, a request times out, or the user asks to connect a new instance. Uses a bundled public-client OAuth setup helper and Kiro's native MCP settings."
compatibility: Setup requires Node.js 22+, local Kiro IDE 1.1.70, and instance-level MCP enabled. Workflow skills use n8n 2.34.0+ tool names; the live public-OAuth test used local n8n 2.41.0 development.
metadata:
  author: n8n
  version: "1.0.0"
---

# Connect to n8n

This is a skills-only power. Its tools come from a native Kiro MCP connection,
not a bundled power server. Apply this check before the first n8n tool call in a
conversation and after a connection or authorization failure.

## Verify the intended connection

1. Identify the user's intended n8n instance and its native MCP server name.
   Inspect available connections before setting up another. The helper names
   connections `n8n-<host>-<hash>` unless a custom name was supplied. Existing
   user-created OAuth or token connections can also be used; do not replace them.
2. Confirm its configured endpoint, scope and observed Kiro connection status.
   If several instances are present and the intended one is ambiguous, clarify
   before any workflow operation. Do not choose production based on list order.
3. Call the cheapest read-only tool that connection actually advertises, using
   its schema. A small workflow search is suitable. If no read tool is available,
   report discovery alone as verified. Never use a write as a connection probe.

A settings file, browser success page or tool count does not prove a successful
MCP read. Missing tools do not prove the instance is empty. If the read succeeds,
continue the task on that same connection; do not repeatedly reconnect.

## Set up a connection

Obtain the instance URL from the user or a verified existing configuration. Do
not guess a host. Accept either its base URL, including any deployment path, or
the Server URL from **n8n > Settings > Instance-level MCP > Connection details >
Connect**. Require HTTPS except on loopback. An owner/admin must enable MCP;
the helper does not change that setting.

**Do not run any command below until you have that URL.** Every `--url` shown in
this file and in the README is a placeholder standing in for the user's own
host. Substitute it. If you have not been given a URL, ask for one; the helper
rejects the documented placeholders rather than attempting a connection.

Check `node --version`; Node.js 22+ must be available in Kiro's environment.
If missing, explain that prerequisite. Do not install a runtime automatically.
The helper detects Kiro's version and currently accepts only IDE 1.1.70. If
detection fails, inspect Help > About and pass that actual version through
`--kiro-version`. Never misreport the version to bypass compatibility checks.

Resolve `scripts/setup.mjs` relative to this skill's actual installed directory.
Use its absolute path, quoting paths and user inputs correctly for the shell.
Do not assume `${PLUGIN_ROOT}` is set or that the user's project contains the
power source. Run the helper; it needs no npm install:

```sh
node "<absolute installed path>/connect-n8n/scripts/setup.mjs" configure --url "<the user's n8n URL>" --json
```

Keep the command as short as the task allows. `--workspace` is optional for the
default user scope, so add it only for workspace scope or to check project
overrides. Long single-line commands have been observed rendering incorrectly in
Kiro's terminal.

If the terminal echoes a corrupted command, or the run produces no output at
all, do not retry variations of it and do not write a wrapper script. Give the
user the exact command to run in their own terminal and ask them to paste the
result back. The helper is safe to run by hand and prints the same JSON.

Default setup writes user settings at `~/.kiro/settings/mcp.json`, making the
connection available across projects. Explain that scope. Add `--scope workspace`
when the user wants only that project. `--workspace` also checks project overrides
when using user scope. Agent-specific settings can override either; inspect the
effective connection in Kiro. Use an explicit `--name` for a requested friendly
name and preserve it for subsequent commands.

On `configured_awaiting_authorization`, tell the user which server was configured
and direct them to **Kiro > MCP Servers > Authenticate**. Kiro owns browser
sign-in, consent, PKCE and tokens. Never request passwords, copy authorization
codes, or implement a login/consent request through REST.

Kiro 1.1.70 may request all advertised scopes even with configured scopes. On the
n8n consent page, choose **Custom** and review workflow read/write/execute plus
execution read for build/run/debug. Respect a read-only selection; request more
permissions only for a task that needs them. Do not claim the helper restricts
the browser request. After consent, repeat the read-only preflight.

## Diagnose failures

Run `doctor` with the same URL, name, scope and workspace to inspect discovery
and local configuration. `--dry-run` on configure previews setup without
registration or file writes. Both make network discovery requests. Neither can
inspect Kiro's token store or prove an authenticated connection.

- **No tools:** inspect the endpoint, connection error and authorization state.
  Check that Kiro can reach the deployment. Localhost in a remote session refers
  to that remote machine; this helper targets local IDE sessions.
- **Network, HTML or 404 response:** check the URL, deployment path, reverse proxy
  and instance MCP setting. Do not infer the exact cause from status alone or try
  another host. Cross-origin authorization servers are currently unsupported.
- **Expired authorization page:** close it, use Retry then Authenticate in Kiro,
  and complete a fresh flow. The helper sets a five-minute connection timeout.
  Do not reuse a stale authorization URL.
- **A previously working call returns 401:** let Kiro refresh or re-authenticate.
  Verify a read afterward. Do not immediately register a new client.
- **Invalid client registration:** after confirming the registration was removed,
  use `repair --new-registration`; this creates a new client and requires fresh
  Kiro authorization. Review unused grants in n8n; the helper does not revoke them.
- **Callback failure:** compare the actual callback with instance policy. An
  occupied port reported by doctor may belong to Kiro. Only for a confirmed
  collision, use `repair --callback-port <available-port>` and authenticate again.
  Do not weaken the instance callback policy.
- **Uncertain registration:** the request may have reached n8n. Consult the instance
  administrator before explicitly retrying with `repair --new-registration`. Avoid a
  loop that consumes the instance's registration limit.
- **Config conflict:** preserve the existing entry and user edits. Use another
  name or reconcile them with the user. Do not delete state to force adoption.
- **Browser success followed by missing `client_id`:** inspect whether the active
  connection is the old bundled server. Public-client setup supplies a client ID
  with no secret. Do not assume user consent failed or repeatedly restart it.

## Missing tools or workflows

Use the actual connection's tools and schemas. Check version, feature/license
availability, OAuth grant, n8n user/project access, and workflow exposure.
Workflow skills use names introduced in n8n 2.34.0; that does not establish OAuth
compatibility for every version. Builder tools can be disabled; folders and tags
depend on their instance features. Reauthorization cannot enable those features
or grant a project role. Search previews can include workflows that are not
Available in MCP; follow the returned access error before inspecting/running.

The old bundled-power path omitted nested schemas in Kiro 1.1.70. Native update
and debug still need acceptance testing. If a required schema is unavailable,
report that limitation instead of guessing operation fields.

## Migration, removal and fallback

For an old bundled server, set up and verify the new native connection before
disabling the old one through Kiro. Check for duplicates after power updates.
No root `mcp.json` is shipped now; Open powers config is not the native connection
setup path. Do not overwrite an existing token connection during migration.

`remove` with the same connection arguments removes only an unchanged managed
entry. It does not revoke OAuth access. Use n8n's Connected clients controls to
revoke the grant. Never place tokens in the power or repository.

If the user explicitly chooses MCP access-token authentication, follow the
[documented fallback](../../README.md#token-fallback). Keep tokens out of chat
and source files. Do not silently switch authentication methods or use the n8n
REST API for workflow operations.

See [helper operations and recovery](../../docs/setup-helper.md) for details.
