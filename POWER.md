---
name: "n8n"
displayName: "Build automation workflows with n8n"
description: "Build, run, and debug n8n workflows in your own n8n instance, wired to the code in your workspace"
keywords: ["n8n", "workflow", "automation", "integration", "webhook", "scheduler", "no-code", "ai-agent", "orchestration"]
author: "n8n"
---

# n8n Power

## Overview

n8n is a workflow automation platform. This power connects Kiro to the MCP server
built in to your own n8n instance. The agent can then read, build, run, and debug
workflows in that instance while it works on the code in your workspace.

**Key capabilities:**

- **Build workflows**: create workflows from code with the n8n Workflow SDK, with
  node discovery, type definitions, and validation before you save
- **Run and test**: execute a workflow and read the result, so a build is verified
  and not only written
- **Debug**: search execution history, open a failed execution, and find the node
  that failed
- **Inspect the instance**: search workflows, projects, folders, tags, credentials,
  and data tables
- **Build Agents**: create and call first-class n8n Agents, when the instance has
  them enabled
- **Version control**: read workflow history, compare versions, and restore one

**Perfect for:**

- Adding automation to the application you have open in Kiro
- Wiring a webhook in n8n to an endpoint you are writing
- Debugging a workflow that failed, without leaving the editor
- Moving a manual process into a scheduled workflow

**Authentication**: OAuth 2.1 in the browser. No API key and no token to paste.
Kiro registers itself with your instance automatically and you approve the scopes
on a consent screen.

## Available Steering Files

- **connect** - pre-flight check. Confirms the instance URL and the connection
  before the agent uses any tool.
- **build** - how to use n8n with the code in your workspace. Covers what the MCP
  server's own instructions do not: the IDE context.
- **debug** - triage loop for a workflow that failed.

## Available MCP Servers

### n8n

**Endpoint:** `POST <your-instance>/mcp-server/http`
**Transport:** Streamable HTTP
**Auth:** OAuth 2.1 with dynamic client registration

The server sends its own instructions and full tool schemas when Kiro connects, so
the tools below are listed by purpose only. The server is the source of truth for
parameters.

**Build and edit**
`create_workflow_from_code`, `update_workflow`, `archive_workflow`,
`publish_workflow`, `unpublish_workflow`, `restore_workflow_version`,
`move_workflows_to_folder`

**Build support**
`get_workflow_sdk_reference`, `get_workflow_best_practices`, `search_nodes`,
`get_node_types`, `validate_workflow`, `validate_node_config`,
`explore_node_resources`

**Run and test**
`execute_workflow`, `test_workflow`, `prepare_workflow_pin_data`

**Read and debug**
`search_workflows`, `get_workflow_details`, `get_workflow_execution`,
`search_workflow_executions`, `get_workflow_history`, `get_workflow_version`,
`get_workflow_versions_diff`

**Instance context**
`get_instance_context`, `get_instance_activity`, `expand_instance_activity`,
`get_node_usage`, `search_projects`, `search_folders`, `list_workflow_tags`,
`list_credentials`

**Data tables**
`search_data_tables`, `get_data_table_rows`, `create_data_table`,
`add_data_table_rows`, `add_data_table_column`, and the matching rename and delete
tools

**Agents** (when enabled on the instance)
`search_agents`, `get_agent`, `create_agent`, `mutate_agent`, `validate_agent`,
`call_agent`, `publish_agent`, and the matching version tools

Which tools appear depends on the scopes you approve and on what the instance has
enabled. A tool that is absent was not granted, or the feature is off.

## Configuration

**Set one environment variable before you install.**

```bash
export N8N_MCP_URL="https://your-instance.app.n8n.cloud/mcp-server/http"
```

Self-hosted instances use the same path on their own host, for example
`https://n8n.example.com/mcp-server/http`.

Find the URL in n8n under **Settings > Instance-level MCP > Connection details**.
Turn MCP access on there first if it is off.

If you cannot set an environment variable, replace `${N8N_MCP_URL}` in `mcp.json`
with the URL.

**Then connect.** Kiro opens a browser window. Approve the scopes on the n8n
consent screen. Nothing else is needed.

**Recommended scopes**

| Scope | Why |
|---|---|
| `workflow:read` | Read workflows, and every read-only build support tool |
| `workflow:write` | Create and update workflows |
| `workflow:execute` | Test what the agent builds |
| `execution:read` | Debug a failed run |
| `credential:read` | Let the agent reuse a credential you already have |

Approve more only if you need them. Do not approve
`communityPackage:install` unless you want the agent to install packages on the
instance.

## Tips

1. **Point it at a development instance first.** The agent can publish and execute.
   Give it an instance where that is safe.
2. **Keep the workspace open.** The value of this power over a chat client is that
   the agent reads your code, so it can wire a webhook to the endpoint you are
   actually writing.
3. **Ask for a test run.** "Build it and test it" produces a verified workflow.
   "Build it" produces an unverified one.
4. **Let the agent read the instance first.** It works better when it has seen the
   workflows you already have than when it starts from a blank page.
