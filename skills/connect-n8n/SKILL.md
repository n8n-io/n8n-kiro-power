---
name: connect-n8n
description: "Set up and verify the n8n MCP connection before using n8n tools. Run on the first turn touching n8n, or when tools are missing, OAuth fails, a request times out, or the user asks to connect a new instance. Uses a bundled public-client OAuth setup helper and Kiro's native MCP settings."
compatibility: Setup requires Node.js 22+, local Kiro IDE 1.1.70, 1.2.4 or 1.2.37, and instance-level MCP enabled. Workflow skills use n8n 2.34.0+ tool names; live local public-OAuth tests used n8n 2.41.0 and 2.42.0 development.
metadata:
  author: n8n
  version: "1.0.0"
---

# Connect to n8n

Tools come from a native Kiro MCP connection. Apply the preflight before the
first n8n tool call, when switching instances, and after connection or access
failures. Reuse a verified connection for subsequent operations.

## Verify the intended connection

1. Identify the intended instance and native MCP server. Inspect existing
   connections first; preserve user-created OAuth and token connections. The
   helper defaults to `n8n-<host>-<hash>`; custom names are also valid.
2. Confirm its endpoint, configuration scope and observed Kiro status. Clarify
   ambiguous instances before workflow operations; never pick production by order.
3. Use the cheapest advertised read tool and its actual schema, such as a small
   workflow search. If none is available, report only discovery as verified.
   Never probe with a write. Settings, a browser success page and tool counts
   alone do not prove an authenticated read or an empty instance.

If setup is needed, read [Commands and Authorization](../../docs/setup-helper.md#commands)
before configuring anything. For failures or missing tools/workflows, read the
relevant [Troubleshooting](../../docs/setup-helper.md#troubleshooting) entry.
For migration, removal or token fallback, read
[Configuration safety and removal](../../docs/setup-helper.md#configuration-safety-and-removal).
Keep these setup details out of an already connected workflow task.

## Load and reuse shared guidance

The build/debug entry skill selects the bundled router and initial capability.
Resolve shared names to `references/n8n-skills/skills/<name>/SKILL.md` relative
to this installed skill; resolve each reference relative to its owning file.
These are local references, with no separate plugin or upstream session/tool hooks.

In Kiro, invoking a shared skill means applying its guidance. Read its file with
Kiro's file-reading capability when the contents are absent from active context.
Load the router and each relevant guide on first use, then reuse their contents.
Re-read if context compaction removed them, the installed snapshot changed, or a
needed rule is unclear. This policy takes precedence over shared instructions to
invoke or re-read a skill on every operation. Still apply the relevant rules on
every operation; this does not cache live workflow state or verification results.

Follow the router's triggers to load specialists as the task needs them. Do not
load all 14 skills or their references upfront. The read-only preflight above is
the exception to loading guidance before MCP calls; load it before subsequent
workflow operations. When supported, `skillsUsed` names only guides whose files
have been read and whose rules were applied since the last successful create/update.
Reused guidance still in context counts; reset that reporting window after success.

Use the bundled snapshot consistently; do not mix it with a separately installed
n8n skills pack. Shared plugin/version or README Drift references mean this
power's version and pinned snapshot. Update through this power's update process;
never edit or `git pull` inside the snapshot. Missing files mean an incomplete
installation, not a reason to silently substitute another pack.

## Kiro execution checks

Use the native connection's live tool names and schemas. If required nested
fields are missing, report the limitation and stop that operation; do not guess
arguments or switch to the n8n REST API for workflow operations.

If Kiro repeatedly omits required `pinData` from `test_workflow`, stop retrying
that tool and report pinned testing as unavailable. When its live schema supports
`manual` execution, `execute_workflow` can run the draft instead. Apply the graph,
pin and effects checks below: this path can run real integrations and needs
authorization for their effects. Do not publish a workflow to bypass the failure.

Before each test, inspect the current pin map and unpinned nodes, including Code
I/O, commands, file operations and sub-workflows. Obtain authorization for real
effects unless already authorized. Read the final result; an execution ID alone
is not success. Report simulated nodes; a simulated pass leaves those integrations
unverified. Distinguish an edited draft from published behavior. Publish only when
authorized for that workflow. Check effects before changing settings on a published workflow because
the change can reactivate it. These checks apply alongside the shared guidance.
