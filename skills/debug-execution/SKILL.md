---
name: debug-execution
description: "Diagnose an n8n workflow that failed, produced the wrong result, or stopped running. Use for execution errors, unexpected output, intermittent failures, and workflow repairs."
compatibility: Requires Kiro with Agent Plugins support and n8n 2.34.0 or later with execution read access.
metadata:
  author: n8n
  version: "1.0.0"
---

# Debug executions from Kiro

Apply [connect-n8n](../connect-n8n/SKILL.md) first, including its shared-skill
loading and execution rules. Keep investigation and repair on that connection.

## Establish the execution evidence

1. Use the run the user identified, or find it with `search_workflow_executions`
   for the workflow and reported time. Filter failures for execution errors;
   include successful runs for incorrect output. If the workflow stopped running,
   check its last run. Search retained executions before requesting another run.
2. Read `get_workflow_execution` with `includeData: true`; the default is metadata
   only. Inspect the first failing or incorrect node and its actual input.
3. Compare against the workflow version saved with that execution. The current
   draft may differ. Use available history and version diffs to establish what
   changed before editing. If execution data has expired, say what is missing.

Read the bundled [shared router](../connect-n8n/references/n8n-skills/skills/using-n8n-skills-official/SKILL.md)
and [debugging skill](../connect-n8n/references/n8n-skills/skills/n8n-debugging-official/SKILL.md).
Continue their investigation using the execution evidence above; follow their
references to parameter verification and other specialist guidance as needed.

## Apply and verify a repair

Read `update_workflow`'s actual operation schema before constructing edits; its
objects are not Workflow SDK factory calls. If Kiro omits the required schema,
report the limitation described in connect-n8n rather than trying guessed fields.

Load [workflow lifecycle](../connect-n8n/references/n8n-skills/skills/n8n-workflow-lifecycle-official/SKILL.md)
for validation and testing. Apply connect-n8n's execution checks before each run.
A pinned external node cannot prove that its API, credentials or connectivity
are fixed. Use an authorized real execution when needed and read its final result.

Report the cause grounded in the observed input/output, the applied fix, the
verification result and remaining limits. Distinguish an edited draft from the
published workflow. Workflow execution tools do not expose standalone Agent
conversations, except for workflows those Agents ran as tools.
