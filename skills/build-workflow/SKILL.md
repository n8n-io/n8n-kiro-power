---
name: build-workflow
description: "Build an n8n workflow using the code open in the workspace, then validate and test it before calling it done. Use when the user asks to create, build, or change an n8n workflow, to automate a task, to add a scheduled job or a webhook, or to connect n8n to the application in this repository. Triggers: build an n8n workflow, automate this, add a webhook, schedule this, wire n8n to my API, create a workflow."
compatibility: Requires Kiro with Agent Plugins support and n8n 2.34.0 or later with workflow builder tools enabled.
metadata:
  author: n8n
  version: "1.0.0"
---

# Building n8n workflows from Kiro

Apply the [connect-n8n pre-flight](../connect-n8n/SKILL.md) before the first n8n
tool call in a conversation. Use the tools and schemas the server actually lists.

The n8n MCP server sends its own build instructions when it connects. Those cover
the tool sequence: read the SDK reference, get best practices, discover nodes, get
node types, validate, then save. **Follow them. Do not re-derive them and do not
work around them.**

This file covers what the server cannot know: you are in an editor, with the
user's code open.

## Use the workspace

A chat client building an n8n workflow only has what the user typed. You have the
repository. Read it before you ask.

- **Find the real endpoint.** If the user wants a workflow that calls their API,
  read the route definitions rather than asking for the URL. Match the actual path,
  method, and payload shape.
- **Match the payload to the code.** When a workflow posts to the user's service,
  build the body from the type or schema in the repo, not from a guess.
- **Read the environment files.** `.env.example`, `docker-compose.yml`, and the
  config module tell you the hostnames and ports the workflow has to reach. Never
  read secrets out of `.env` and never put a secret into a workflow. Use an n8n
  credential.
- **Check what already exists.** Search the repo for existing webhook handlers or
  cron jobs before you build a workflow that duplicates one.

## Wiring n8n to code under development

When the workflow and the application talk to each other, say which side owns
what, and build both halves.

**n8n calls the application.** The workflow needs a reachable URL. `localhost` in
a cloud n8n instance means the n8n container, not the user's machine. Say this
explicitly rather than building something that silently cannot work. Offer a
tunnel, a deployed environment, or a self-hosted n8n on the same network.

**The application calls n8n.** The workflow needs a Webhook trigger. Build the
workflow first, read the production webhook URL off it, then write the calling
code in the repo with that URL. Do not invent the URL. The production endpoint
requires publication; a saved draft or a pinned test does not make it live.

**Both.** Build and validate the n8n side first. Then write the application side
against the returned URL and contract. Keep the real round trip marked unverified
until you have tested the reachable endpoint with the user's authorization.

## Test before you claim it works

The build loop has a verification step and it is not optional.

- Validate before you save. A validation error is cheaper than a failed run.
- Test after you save, and **read the result**. Report whether the test used
  simulated external outputs or real integrations.
- Report what the test actually returned. If it failed, say so and fix it. Do not
  describe an untested workflow as done.

Use the pin-data preparation tool the server lists. It returns output schemas;
generate sample items that match them and pass those items to `test_workflow`.
Inspect the actual pin-data map before running: a node omitted from that map is
not made safe merely by the tool's name.

A successful pinned test verifies only the nodes that executed against those
samples. It cannot prove an API URL, credential, external request, or webhook
round trip works when that part was simulated. State which nodes were pinned
and what still needs a real check. Do not publish just to obtain a green test.

### A test run is not a dry run

The pin-data preparation tool identifies triggers, credentialed nodes, and HTTP
Request nodes for simulation. **Unpinned nodes execute for real**, including
Execute Command, file reads and writes, and Code nodes that do their own I/O.

Before testing, inspect the unpinned nodes and their effects. Check again after
an edit that changes those effects or after changing the pin data.

- If every unpinned node is pure data shaping (Set, If, Merge, plain Code), test
  without asking.
- If an unpinned node does I/O or changes state, name the node, target, and effect.
  Obtain authorization for that effect before the call unless the user has
  already authorized it. For example: "The unpinned Execute Command node will
  write a file on the n8n execution host. May I run that test?" A pinned Slack
  node does not send a message.
- If the user declines, validate and stop there. Tell them the workflow is
  unverified and why, rather than quietly calling it done.

Pinning the side-effecting node is often the better answer. Offer it.

For a real integration check, use `execute_workflow` only when its effects are
authorized. Specify the intended execution mode, trigger, and inputs using the
advertised schema. Follow the returned execution ID with `get_workflow_execution`
and request `includeData: true` when node results are needed. A started execution
is not a completed test. Report success only after reading its final result.

## Publishing

Creating a workflow does not activate it. `publish_workflow` does.

Publish only when the user has authorized publication of this workflow. A
published workflow with a schedule or webhook can start real work. For an
existing workflow, distinguish the edited draft from its published version;
report when a fix is still a draft. Changes to workflow-level settings on an
already published workflow can reactivate it, so check and authorize their live
effects before applying them too.

## Credentials

- Call `list_credentials` and reuse what the user has. Do not create a duplicate.
- Never write a key, token, or password into workflow parameters. Credentials are
  a separate object for a reason.
- If no credential fits, say which one the user has to create and where. You
  cannot create one for them.

## When a tool is missing

Follow [connect-n8n](../connect-n8n/SKILL.md) to check the version, enabled features,
license, OAuth grant, and workflow access. Name the missing tool and its purpose.
Do not guess scope names, bypass an access restriction, or ask for all permissions.
