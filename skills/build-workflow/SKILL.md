---
name: build-workflow
description: "Build or change an n8n workflow using the code in the workspace. Use for automation, scheduled jobs, webhooks, or connecting n8n to the application in this repository."
compatibility: Requires Kiro with Agent Plugins support and n8n 2.34.0 or later with workflow builder tools enabled.
metadata:
  author: n8n
  version: "1.0.0"
---

# Build workflows from Kiro

Apply [connect-n8n](../connect-n8n/SKILL.md) first, including its shared-skill
loading and execution rules. Keep all calls on that verified native connection.
Read the bundled [shared router](../connect-n8n/references/n8n-skills/skills/using-n8n-skills-official/SKILL.md),
then [workflow lifecycle](../connect-n8n/references/n8n-skills/skills/n8n-workflow-lifecycle-official/SKILL.md).
Follow their routing to the relevant node, expression, credential and other
specialist skills. Read the server's SDK reference and best practices before
building, using the advertised tool names and schemas.

## Apply the editor context

- Read route definitions and types to establish the actual endpoint, method and
  request body. Search for existing webhook handlers and scheduled jobs first.
- Use `.env.example`, compose files and configuration modules for hosts and ports.
  Keep secrets out of chat and workflow parameters; use n8n credentials.
- For n8n calling the application, establish a reachable URL. `localhost` on
  hosted n8n refers to its execution host. Use an authorized tunnel, deployment,
  or a shared network when the application runs on the user's machine.
- For the application calling n8n, build the workflow and use its returned webhook
  URL. A production webhook requires publication; a saved draft is not live.
- Build and validate the n8n side before wiring application code to its contract.
  Leave the real round trip unverified until the reachable endpoint is tested.

## Verify and report

Use the shared lifecycle's testing guidance. Apply connect-n8n's execution checks
before each test, including after changing the workflow or pin data. Read the
final execution result, state which nodes were simulated, and distinguish draft
changes from published behavior. An execution ID alone does not establish success.

A Manual Trigger emits an empty item. Add a pure data node when a repeatable
manual smoke test needs input; a previous `test_workflow` pin map does not supply
input to a later `execute_workflow` call.

If an advertised tool schema is incomplete, follow the Kiro limitation handling
in connect-n8n before attempting the affected operation. Do not guess arguments.
