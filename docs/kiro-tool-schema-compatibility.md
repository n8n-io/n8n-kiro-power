# Kiro power tool-schema compatibility

Live testing on 2026-09-25 found a second issue after resolving the n8n OAuth
failure locally: Kiro IDE 1.1.70 omits nested input schemas and enum choices from
the tool-discovery text its agent receives for powers. This affects reliable
workflow updates and debugging, independently of OAuth.

## Evidence

The installed Kiro extension's `kiro_powers` activation handler obtains each
tool's complete `inputSchema`. Its formatting code iterates only the top-level
`properties` and emits each property's name, whether it is required, its
`type`, and its `description`. It does not emit nested properties, array item
schemas, union alternatives, or enum values. The raw UI card includes more
data, but the formatted model response and its saved text file omit those
details. The action schema directs callers to activation for argument schemas;
it offers `list`, `activate`, `use`, `readSteering`, and `readSkill`, with no
separate full-schema lookup action.

For `update_workflow`, the saved activation response describes `operations`
only as an array of ordered operations. It does not tell the agent that an
operation uses the discriminator `type`, node JSON uses `typeVersion`, and
connection operations use `source` and `target`.

In the live test, Kiro tried `op`, `version`, `from`, and `to`. n8n rejected the
request during input validation, without changing the draft. Reading the saved
activation output did not recover the missing schema. Kiro also requested an
SDK reference section named `operations`, which was rejected: the allowed enum
values had likewise been omitted from discovery.

## Acceptance-test workaround

To continue the isolated local test, a JSON file containing the `addNode`,
`addConnection`, and `removeConnection` schemas was generated directly from the
running n8n build's Zod operation schema and supplied in the synthetic workspace.
This is test assistance, not a portable fix in the power package. It does not
prove that a fresh installation can reliably edit workflows unaided.

With that schema supplied, Kiro updated the existing draft successfully and
both the simulated and real manual executions returned the expected output.
The complete run, including the earlier failed execution, is recorded in the
[release checklist](release-checklist.md#local-server-fix-verification-2026-09-25).

## Required resolution

Kiro should expose complete MCP input schemas to its agent, either in activation
or through an on-demand schema lookup. Preserve enum values and nested array,
object, and union schemas. Repeat workflow creation, update, execution, and
debugging with no externally supplied schema before removing this release gate.

Until then, the skills must report missing schemas instead of inventing
arguments. Copying a version-specific snapshot of every n8n tool schema into this
power would introduce another compatibility surface and is not the chosen fix.
