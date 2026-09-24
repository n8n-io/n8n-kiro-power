---
name: debug-execution
description: "Diagnose an n8n workflow that failed, produced the wrong result, or stopped running, working from execution data rather than the workflow definition. Use when the user reports a broken, failing, or flaky workflow, asks why a run failed, or asks what changed. Triggers: my n8n workflow failed, why did this workflow break, n8n execution error, workflow stopped working, debug this workflow, intermittent failures."
metadata:
  author: n8n
  version: "1.0.0"
---

# Debugging a failed n8n workflow

Use this when a workflow failed, produced the wrong result, or stopped running.
Work from evidence. Do not guess from the workflow definition alone.

## Order of investigation

1. **Find the run.** `search_workflow_executions` for the workflow, filtered to
   failures. Take the most recent one, and note whether failures are constant or
   intermittent. That distinction changes the diagnosis more than anything else.
2. **Open it.** `get_workflow_execution` gives the per-node result. Find the first
   node that failed, not the last. Later errors are usually consequences.
3. **Read the input to the failing node**, not only its error. Most n8n failures
   are a shape mismatch: the node ran correctly against data it did not expect.
4. **Compare against the definition.** `get_workflow_details` shows what the node
   is configured to do. Now you can say whether the config is wrong or the data
   is.
5. **Check whether it changed.** If it used to work, `get_workflow_history` and
   `get_workflow_versions_diff` show what was edited and when. Match that against
   the date failures started.

## Common causes, in rough order of frequency

- **Empty input.** A node ran with zero items and the expression referencing
  `$json.something` failed. Check the node upstream, not the one that errored.
- **Shape change.** An upstream API changed its response. The execution data shows
  the real payload; compare it against what the expression expects.
- **Credential expired or revoked.** The error is an auth failure from the
  external service, not from n8n. The user has to fix the credential; you cannot.
- **Rate limit or timeout.** Intermittent failures, often with a 429 or a socket
  error. This is a retry and backoff problem, not a logic problem.
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

- Apply the fix with `update_workflow`, then `test_workflow` and read the result.
  A fix that has not been re-run is a hypothesis.
- For intermittent failures, prefer `setNodeSettings` with `retryOnFail` and
  `maxTries` over restructuring the workflow.
- If the fix needs error handling the workflow does not have, explain the options
  and ask. Do not add an Error Trigger or an error workflow silently.

## Limits

- Agent conversations are not workflow executions. `get_workflow_execution` and
  `search_workflow_executions` cover workflow runs only, including workflows an
  Agent called as a tool.
- Execution data is retained according to the instance settings. If the run you
  want is gone, say so rather than reasoning about a run you cannot see.
- If the execution tools are not available to you, they were not granted. Say
  that, and that reconnecting lets the user grant them, instead of guessing at
  the cause from the workflow definition.
