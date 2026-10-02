---
name: build-workflow
description: "Build or change an n8n workflow using the code in the workspace. Use for automation, scheduled jobs, webhooks, or connecting n8n to the application in this repository."
compatibility: Requires Kiro with Agent Plugins support and n8n 2.34.0 or later with workflow builder tools enabled.
metadata:
  author: n8n
  version: "1.0.0"
---

# Build workflows from Kiro

Apply [connect-n8n](../connect-n8n/SKILL.md), including its loading policy and
execution checks. Keep operations on that verified native connection.
Load the [shared router](../connect-n8n/references/n8n-skills/skills/using-n8n-skills-official/SKILL.md)
and [workflow lifecycle](../connect-n8n/references/n8n-skills/skills/n8n-workflow-lifecycle-official/SKILL.md)
when absent from context. They own workflow procedure, specialist routing,
validation, testing and handoff.

## Apply the editor context

- Read route definitions and types for the endpoint, method and request body.
  Search existing webhook handlers and scheduled jobs before adding another.
- Use `.env.example`, compose files and configuration modules for hosts and ports.
- For n8n calling the application, establish a reachable URL: `localhost` on
  hosted n8n is its execution host. Use an authorized tunnel, deployment or shared
  network when the application runs on the user's machine.
- For the application calling n8n, use the workflow's returned webhook URL.
  A production webhook requires publication; a saved draft is not live.
- Build and validate the n8n side before wiring application code to its contract.
  Leave the real round trip unverified until the reachable endpoint is tested.

A Manual Trigger emits an empty item. Add a pure data node when a repeatable
manual smoke test needs input; a previous `test_workflow` pin map does not supply
input to a later `execute_workflow` call.
