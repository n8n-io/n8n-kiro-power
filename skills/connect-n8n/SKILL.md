---
name: connect-n8n
description: "Check and fix the connection to the n8n MCP server before any n8n tool is used. Run this on the first turn of a conversation that touches n8n. Use when the n8n server shows no tools, when a connection is refused or times out, when authorization fails or a call returns 401, when a tool the user expected is absent, or when the user asks how to set up or configure the n8n power. Triggers: No tools available, failed to connect to n8n, n8n MCP not working, set up n8n, configure n8n instance URL, n8n 401, n8n unauthorized, YOUR-N8N-HOST."
compatibility: Requires Kiro with Agent Plugins support and n8n 2.34.0 or later with instance-level MCP enabled.
metadata:
  author: n8n
  version: "1.0.0"
---

# Connecting to n8n

Run this check on the first turn of a new conversation in this power, before any
n8n tool call. Do not skip it because the config file looks populated.

## Pre-flight

**A populated `mcp.json` does not prove a working connection.** It proves a file
was written. The host still has to be filled in and reachable, and the OAuth flow
still has to have been completed in a browser, so both can be missing while the
config looks correct.

Before you use any n8n tool, confirm all three:

1. **The server is listed.** Look for the power's n8n server, including Kiro's
   namespaced name. If it is absent, check power activation and the connection
   error before assuming the server failed to start.
2. **The URL is a real host.** The shipped entry has the placeholder
   `YOUR-N8N-HOST`. If that is still there, it was never configured.
3. **A tool call succeeds.** Pick the cheapest read-only tool the server actually
   lists, such as a workflow search with a small result limit, and call it. Use
   the advertised schema rather than a name from memory. If only write tools
   are listed, report that tool discovery succeeded but no read call was tested.
   Do not issue a write as a connection probe.

If step 3 succeeds, say so once and continue. Repeat only if the connection or
authorization changes or a later call fails.

## When the URL is not configured

One possible symptom is **"(No tools available)"**. Check the configured URL and
connection error: this message alone does not distinguish a placeholder, a
network failure, or an authorization problem. It does not mean the instance is
empty.

Use the `mcp.json` next to `plugin.json` in the local folder selected during
import. Replace the entire placeholder URL with the user's copied Server URL,
then import the configured folder again and reconnect. Agent Plugins servers
are managed internally by Kiro; do not direct the user to the ordinary
`~/.kiro/settings/mcp.json` to edit this power.

**Do not guess the host and do not try other hosts.** Every instance has a
different one and there is no default worth attempting. Copy the full URL,
including any deployment base path. It ends in `/mcp-server/http`.

The full URL is in n8n under
**Settings > Instance-level MCP > Connection details > Connect**, on the OAuth
tab. Use HTTPS except for loopback addresses.

**Do not suggest an environment variable.** The [Agent Plugins specification](https://agent-plugins.org/specification)
requires a literal URL and forbids environment-variable expansion in that field.
Never put a password or token in the URL or configuration.

## When Kiro cannot reach the host

Kiro has to reach the host from wherever it is running, and that is not always
the user's machine. A Kiro cloud session runs remotely, so an instance that only
resolves on the user's own network is unreachable from it, and `localhost` points
at the remote machine rather than theirs.

Check this before you debug anything else, because it looks like a plain network
failure. Say it plainly rather than retrying the connection.

## When the connection is refused or times out

Work through these in order and report what you find:

- **MCP access is off on the instance.** Ask an owner or admin to check
  Settings > Instance-level MCP. The feature can also be disabled on self-hosted
  instances with `N8N_DISABLED_MODULES=mcp`.
- **The URL is missing the path.** The base host alone is not the endpoint. It
  must end in `/mcp-server/http`.
- **Kiro cannot reach the host.** See the section above.

## When authorization fails

This power uses OAuth with dynamic client registration. Complete the browser
sign-in instead of asking the user for an API key. Inspect the actual connection
error before diagnosing a failure.

- **The browser window did not open or was closed.** Ask the user to retry the
  connection.
- **OAuth rejects the callback URL.** An admin may have restricted allowed
  callback URLs. Compare the reported callback with the instance's allowlist;
  do not disable that restriction as a workaround.
- **A call returns 401 after working earlier.** The token may have expired or
  access may have been revoked. Stop and reconnect before another tool call.

## When a tool or workflow is unavailable

Name the missing tool or workflow and what you need it for. Check these causes:

1. **Version.** These skills target n8n 2.34.0 or later. Earlier releases use
   different names for execution and other tools. Recommend a current stable
   version; do not invent calls to an unavailable tool.
2. **Features and license.** Builder tools can be disabled with
   `N8N_MCP_BUILDER_ENABLED=false`. Folder tools require the folders feature.
   Disabled workflow tags remove the tag tool. Reconnecting cannot enable these.
3. **OAuth grant.** If the tool exists on this instance but was not granted,
   reconnect to request the needed permission. Do not ask for all permissions.
4. **Workflow exposure and user access.** Search can return a preview even when
   **Available in MCP** is off. Inspection, testing, and editing also require
   workflow exposure and the user's own n8n permissions. Follow the returned
   error to distinguish these conditions; a new OAuth grant cannot grant a
   project role the user does not have.

## What not to do

- Do not report the power as working because the config file exists.
- Do not fall back to the n8n REST API or an API key. This power uses MCP only.
- Do not try to enable MCP access on the instance yourself. It is an instance
  setting and the user has to make that decision.
