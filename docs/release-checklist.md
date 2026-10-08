# Release checklist

**Status: draft candidate.** This is the single current release checklist.
The [setup guide](setup-helper.md) describes the implemented commands.
The package contains skills and a bundled helper; it ships no root `mcp.json`.

Setup accepts local Kiro IDE 1.1.70, 1.2.4 and 1.2.37 with Node.js 22+;
version-specific live validation is recorded below. n8n 2.34.0 is
the workflow tool-name floor, not a verified public-OAuth minimum.

## Recorded evidence

| Check | Evidence and limits |
| --- | --- |
| Helper regression tests | On 2026-09-29, all 43 tests passed locally. Seven new regression cases failed against `20f9df6` and pass with the fixes. |
| Current candidate checks | On 2026-10-08, all 66 tests, bundle reproducibility and package checks passed on macOS / Node 24.19.0, including detected Kiro 1.2.37 and upgrade/reuse coverage. Both bundled validators and their full error-response expressions separately passed checks with the local n8n 2.43.0 expression runtime, including scalar bodies, invalid tags, unknown fields and a `__proto__` key. This expression runtime was not the live MCP server below. |
| Cross-platform CI | `20f9df6` passed Node 22/24 on macOS, Linux, and Windows plus manifest validation. Check the candidate commit's CI before release; helper tests do not establish IDE support on every OS. |
| New helper and OAuth | On 2026-09-28, Kiro 1.1.70 completed fresh S256 PKCE consent with a helper-created public client, discovered 23 tools, and called `search_workflows` successfully. Target: isolated local n8n 2.41.0 development without the Basic-authentication patch; disposable workspace configuration. |
| Earlier public-OAuth proof | Synthetic workflow creation/execution, refresh, revocation, and reconnect passed locally before the final helper was packaged. This is not installed-package acceptance. |
| Cloud | On 2026-09-30, an installed power on local Kiro 1.1.70 configured a public client against a cloud instance, completed browser authorization and consent, and returned results from `search_workflows`. Build, test, publish, and repair loops were not exercised. |
| Shared skill discovery | On 2026-10-02, folder import of the PR #2 candidate on macOS / Kiro 1.1.70 showed exactly `connect-n8n`, `build-workflow` and `debug-execution`; none of the 14 nested official skills appeared as extra entries. The temporary import was removed afterward. `Try power` required an open workspace, so reference-loading and build/debug behavior remain unverified. |
| Installed reference reads | On 2026-10-08, a fresh folder import of `78e9629` as an isolated `n8n-acceptance` power exposed exactly three entry skills. All 71 installed skill/helper/reference files matched the candidate. Kiro discovered the installed path without being given it and read the bundled router, lifecycle, node-configuration, expressions and Code-node guides during a real native MCP build. |
| Follow-up reference reuse | The wrong-output repair loaded only the debug entry skill and bundled debugging guide. The runtime-error repair read no new guidance. The earlier router and specialists were reused; unrelated guides and setup/recovery documentation stayed unloaded during the workflow tasks. |
| Power update and reinstall | On 2026-10-08, Kiro installed a local candidate update, then uninstalled and reinstalled the isolated test power. Exactly three entry skills remained; all 71 installed skill/helper/reference files matched the candidate. Workspace MCP configuration and the helper registry stayed byte-for-byte unchanged. |
| Restart persistence | After the power reinstall, Kiro was fully quit and relaunched. Native `get_workflow_details` succeeded with the saved OAuth grant, without new consent or registration, and confirmed the unpublished two-node draft and correct formula. |
| Helper invocation in Kiro | The updated installed helper detected 1.2.37 and reused the registration with `changed: false` from the normal shell. Inside Kiro, even `node --version` returned no output and exit -1; a proposed path-variation retry was denied. Agent-terminal onboarding remains unverified. |
| Compaction attempt | On Kiro 1.2.4, `/compact` produced an ordinary assistant summary; the context meter increased and no compaction event was visible. Reloading missing guidance after actual compaction is still unverified. |
| Kiro compatibility | Setup accepts exact versions 1.1.70, 1.2.4 and 1.2.37; tests cover detected-version setup and registration reuse after upgrading. Unknown and prerelease versions remain rejected. A normal IDE restart installed a pending 1.2.37 update during acceptance; native OAuth and workflow results below are from 1.2.37. |
| Imported guidance audit | All 13 content comments on PR #2 were confirmed on 2026-10-02: eight by running the exact examples or n8n 2.41.0's built validators/execution engine, and five by checking the pinned text and reference paths. On 2026-10-08, local corrections fixed the examples and guidance without modifying `n8n-io/skills`; regression tests execute both bundled validators and the per-item Code example. Sync now verifies the locked upstream files plus the reviewed patch and rejects conflicting updates. |
| Native workflow acceptance | Kiro 1.2.37 / macOS 27.0.1 / Node 24.19.0 against localhost n8n 2.42.0 development (`a4b87fccbe`), without changes to its OAuth implementation. The user granted workflow read/write/execute and execution read; the native connection exposed 59 tools and completed an authenticated read. Kiro created an unpublished Manual Trigger → Code workflow through live MCP schemas and completed the five executions below. No workflow operation used REST or an externally supplied schema. |

### Native workflow results (2026-10-08)

Synthetic workflow `5ZIkSrjTdfhJEQdT` remained unpublished. Only its arithmetic
Code node ran; no credentials or external integrations were involved.

| Execution | Expected test | Observed result |
| --- | --- | --- |
| 1390 | Build and run | Success; discounted totals A=45, B=24. |
| 1391 | Remove the discount formula | Success status with deliberately wrong totals A=50, B=30. |
| 1392 | Inspect and repair wrong output | Success; restored A=45, B=24. |
| 1393 | Throw `KIRO_ACCEPTANCE_FAILURE` | Error at the Code node, confirmed in execution data. |
| 1394 | Inspect and repair runtime error | Success; restored A=45, B=24. |

Execution data showed the Manual Trigger pinned with an empty synthetic item in
1390 and 1392–1394; the Code node was unpinned and executed. Execution 1391 had an
empty pin map. These results do not validate any external integration.

Two native `test_workflow` calls omitted required `pinData` and failed before
execution. The cause of the omission is not established. The verified fallback
was the live `execute_workflow` tool with `executionMode: "manual"`, followed by
`get_workflow_execution` with data. The connection skill now describes this path
and requires reviewing pins and real effects; it must not publish to bypass a
failure. One validation call also supplied an array as a string, and one update
used a version name over 80 characters; corrected retries passed.

The detailed September 25–28 investigation and test records are preserved at
[the reviewed commit](https://github.com/n8n-io/n8n-kiro-power/tree/20f9df620045dd0418e78f52459a5e2a413f6013/docs).
Their packaging statements describe those experiments, not the current package.

Known client issues: older Kiro sessions corrupted long terminal commands; the
1.2.37 check above failed even for `node --version`. Setup can use the normal
terminal, but automatic agent-terminal onboarding is not established. Kiro also
had transient MCP and own-auth/model timeouts during this run while local n8n
remained healthy; restarting Kiro cleared them. These are limits of the observed
client session, not evidence of an n8n OAuth failure.

## Acceptance gates

Use a development instance and synthetic data. Record the candidate commit,
Kiro/OS/n8n versions, hosting model, result, and any skipped checks. Keep tokens,
passwords, and private payloads out of evidence.

- [ ] **Installed onboarding:** import the power from a clean folder/GitHub
      installation, invoke its installed helper with Node available to Kiro,
      authorize, and verify a read without editing JSON or copying a token.
- [ ] **Supported servers:** complete public OAuth and MCP operations on Cloud
      and a released self-hosted n8n version without the Basic-authentication
      patch. Establish the oldest verified release.
- [x] **Core workflow acceptance:** create a draft, run it, introduce wrong output
      and an execution error, inspect the relevant runs, repair, and rerun through
      native MCP without an externally supplied schema. Confirm final outputs.
      For the shared-skills adapter, confirm Kiro reads the bundled router and
      relevant capability/reference files without relying on another agent's
      Skill tool or session hooks; repeat this on a clean power installation.
      Confirm only the three entry skills are exposed. Record files read during
      a simple build and follow-up debug task: setup/recovery and unrelated
      guides should stay unloaded, and guidance still in context should be
      reused. The native manual-execution fallback and its limits are recorded above.
- [ ] **Context recovery:** after actual compaction, verify missing guidance is
      loaded again; an ordinary assistant summary does not establish this.
- [ ] **Access and effects:** respect a read-only grant and unavailable workflows;
      distinguish simulated data from real integrations and obtain authorization
      for actual external effects. Do not publish a workflow merely to test it.
- [ ] **Connection lifecycle:** verify user settings across projects, full IDE
      restart, token expiry/revocation, and replacement-registration refresh.
      Verify Kiro on each platform claimed as supported.
- [x] **Local update/reinstall:** update and reinstall the skills-only power,
      preserve the native connection and settings, and verify a read after a full
      IDE restart without another registration.
- [ ] **Legacy migration:** verify removal of old bundled duplicates without
      disturbing separately managed OAuth or token connections.

## Release order

1. [Power PR #1](https://github.com/n8n-io/n8n-kiro-power/pull/1) is merged.
   Complete acceptance and review [shared-skills PR #2](https://github.com/n8n-io/n8n-kiro-power/pull/2),
   merge it to `main`, then verify a clean import of the public repository URL at
   the merged commit. There is no npm publication or hosted service deployment.
2. Confirm the maintainer, durable monitored email, and authorized submitter.
   Have that representative review and accept the publisher terms.
3. Check the [current submission requirements](https://kiro.dev/powers/submit/)
   and submit the public repository URL.

[n8n PR #39637](https://github.com/n8n-io/n8n/pull/39637) separately fixes HTTP
Basic client authentication. Public-client OAuth does not require that PR or a
new n8n OAuth release.

## Application text

- **Organization:** n8n
- **Use case:** Build automation workflows
- **Repository:** https://github.com/n8n-io/n8n-kiro-power
- **Submitter name and durable contact email:** to be supplied by the publisher

Suggested domain description:

> n8n is a workflow automation platform. This power connects Kiro to the built-in
> MCP server of a user's n8n Cloud or self-hosted instance. It helps developers
> build, run, and debug workflows using the routes, types, and configuration in
> their editor workspace. Access follows the user's n8n permissions, OAuth grant,
> and workflow exposure settings. Workflows remain normal n8n workflows that can
> be opened, edited, and run independently of Kiro.
