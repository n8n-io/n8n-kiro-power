---
name: debug-execution
description: "Diagnose an n8n workflow that failed, produced the wrong result, or stopped running. Use for execution errors, unexpected output, intermittent failures, and workflow repairs."
compatibility: Requires Kiro with Agent Plugins support and n8n 2.34.0 or later with execution read access.
metadata:
  author: n8n
  version: "1.0.0"
---

# Debug executions from Kiro

Apply [connect-n8n](../connect-n8n/SKILL.md), including its loading policy and
execution checks. Keep investigation and repair on that verified connection.
Load the [shared router](../connect-n8n/references/n8n-skills/skills/using-n8n-skills-official/SKILL.md)
and [debugging guide](../connect-n8n/references/n8n-skills/skills/n8n-debugging-official/SKILL.md)
when absent from context, before workflow investigation calls.

## Ground the shared investigation in the actual run

- Use the user's execution or search retained runs with `search_workflow_executions`
  for the workflow and reported time before requesting another run. Filter failures
  for execution errors; include successful runs for incorrect output. If it stopped
  running, check the last run. This replaces the shared shortcut to request a rerun
  when no execution ID is supplied.
- Compare against the workflow version saved with that execution; the current
  draft may differ. Use available history and diffs before editing. If execution
  data has expired, state which evidence is missing.

## Apply a repair

Read `update_workflow`'s advertised operation schema; these objects are not
Workflow SDK factory calls. Follow connect-n8n's missing-schema handling.
For an edit or test, apply [workflow lifecycle](../connect-n8n/references/n8n-skills/skills/n8n-workflow-lifecycle-official/SKILL.md),
loading it if absent from context, and follow the connection's execution checks.

Workflow execution tools do not expose standalone Agent conversations, except
for workflows those Agents ran as tools.
