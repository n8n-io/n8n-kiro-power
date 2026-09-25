---
name: debug-execution
description: "Diagnose an n8n workflow that failed, produced the wrong result, or stopped running, working from execution data rather than the workflow definition. Use when the user reports a broken, failing, or flaky workflow, asks why a run failed, or asks what changed. Triggers: my n8n workflow failed, why did this workflow break, n8n execution error, workflow stopped working, debug this workflow, intermittent failures."
compatibility: Requires Kiro with Agent Plugins support and n8n 2.34.0 or later with execution read access.
metadata:
  author: n8n
  version: "1.0.0"
---

# Debugging a failed n8n workflow

Use this when a workflow failed, produced the wrong result, or stopped running.
Work from evidence. Do not guess from the workflow definition alone.
Apply the [connect-n8n pre-flight](../connect-n8n/SKILL.md) before the first n8n
tool call in a conversation. Use the schemas the server actually lists.

## Order of investigation

1. **Find the run.** `search_workflow_executions` for the workflow, filtered to
   failures. Take the most recent one, and note whether failures are constant or
   intermittent. That distinction changes the diagnosis more than anything else.
2. **Open it.** Call `get_workflow_execution` with `includeData: true` to read
   node results; the default response contains metadata only. Use `nodeNames`
   and `truncateData` when useful to limit the returned data. Find the first
   node that failed, not the last. Later errors are usually consequences.
3. **Read the input to the failing node**, not only its error. Compare the actual
   fields and values with what the node expects before diagnosing a shape mismatch.
4. **Compare against the version that ran.** Inspect the workflow definition
   saved with the execution when available. `get_workflow_details` describes
   the current draft and published version, which may differ from the failed
   run. Use version history to resolve the difference before editing.
5. **Check whether it changed.** If it used to work, `get_workflow_history` and
   `get_workflow_versions_diff` show what was edited and when. Match that against
   the date failures started.

## Common causes

- **Missing input.** Check whether the upstream node emitted items and whether
  those items contain the expected fields. A node receiving no items may not run.
- **Shape change.** An upstream API changed its response. The execution data shows
  the real payload; compare it against what the expression expects.
- **Credential expired or revoked.** The error is an auth failure from the
  external service, not from n8n. The user has to fix the credential; you cannot.
- **Rate limit or timeout.** Look for a 429, a socket error, or evidence of a
  service limit. Check whether retrying could duplicate a write before adding
  retry behavior.
- **A change that was never tested.** The history diff shows an edit right before
  the first failure.

## Reporting

Say three things, in this order:

1. Which node failed and what the error was.
2. Why, in terms of the actual input data you read.
3. The fix, and whether it is something you can apply or something the user has to
   do.

Do not propose a fix you have not grounded in execution data. "It might be the
credential" is not a diagnosis when you can read the error.

## Fixing

- Apply the grounded fix with `update_workflow`. Inspect validation warnings.
  Before any test, apply the [build-workflow test checks](../build-workflow/SKILL.md#test-before-you-claim-it-works):
  prepare pin data, inspect which nodes remain unpinned, and obtain authorization
  for their I/O or state changes unless already authorized. Unpinned command,
  file, and Code nodes can execute on the n8n host during `test_workflow`.
- Run `test_workflow` and read its result. Report which nodes were simulated.
  A pinned HTTP or credentialed node cannot prove an API, auth, connectivity,
  or rate-limit failure is fixed. If a real check is needed, explain its effects
  and use an authorized `execute_workflow` call with an explicit execution mode.
  Read the final execution result; otherwise leave the integration unverified.
- For failures that are safe to retry, prefer an `update_workflow` call with a
  `setNodeSettings` operation setting `retryOnFail` and
  `maxTries` over restructuring the workflow.
- If the fix needs error handling the workflow does not have, explain the options
  and ask. Do not add an Error Trigger or an error workflow silently.
- Report whether the change is in the draft or the published version. A passing
  draft test does not update the production workflow. Publish only if the user
  authorized it, then verify the relevant published behavior. Check live effects
  before changing workflow-level settings, which can reactivate a published
  workflow.

## Limits

- Agent conversations are not workflow executions. `get_workflow_execution` and
  `search_workflow_executions` cover workflow runs only, including workflows an
  Agent called as a tool.
- Execution data is retained according to the instance settings. If the run you
  want is gone, say so rather than reasoning about a run you cannot see.
- If tools or workflow data are unavailable, use
  [connect-n8n](../connect-n8n/SKILL.md) to distinguish version or feature limits,
  OAuth permissions, workflow exposure, and user access. Do not diagnose a
  failure from a definition when the necessary execution evidence is missing.
