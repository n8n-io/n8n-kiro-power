# Release checklist

**Status: merged to main; release validation incomplete.** Last reviewed 2026-10-14.
[PR #2](https://github.com/n8n-io/n8n-kiro-power/pull/2) merged on 2026-10-08
as `65bff7a`. The remaining acceptance checks and submission steps are below.
The [setup guide](setup-helper.md) describes the implemented commands.
The package contains skills and a bundled helper; it ships no root `mcp.json`.

Setup accepts local Kiro IDE 1.1.70, 1.2.4 and 1.2.37 with Node.js 22+;
version-specific live validation is recorded below. n8n 2.34.0 is
the workflow tool-name floor, not a verified public-OAuth minimum.

## Recorded evidence

| Check | Evidence and limits |
| --- | --- |
| Automated checks | On 2026-10-08, all 66 tests, bundle reproducibility and package checks passed on macOS / Node 24.19.0, including detected Kiro 1.2.37 and upgrade/reuse coverage. All [eight validation jobs](https://github.com/n8n-io/n8n-kiro-power/actions/runs/37848562847) passed on merged commit `65bff7a`: Node 22/24 on macOS, Linux and Windows, plus manifest and shared-snapshot checks. Helper CI does not establish IDE support on every OS. |
| Validator runtime | Both bundled validators and their full error-response expressions passed checks with the local n8n 2.43.0 expression runtime, including scalar bodies, invalid tags, unknown fields and a `__proto__` key. This runtime was not the live MCP server below. |
| Local public OAuth | On 2026-09-28, Kiro 1.1.70 completed S256 PKCE consent with a helper-created public client and called `search_workflows` on local n8n 2.41.0 development without the Basic-authentication patch. The 2026-10-08 installed-power test completed OAuth and a native read on Kiro 1.2.37 / local n8n 2.42.0 development. |
| Cloud | On 2026-09-30, an installed power on local Kiro 1.1.70 configured a public client against a cloud instance, completed browser authorization and consent, and returned results from `search_workflows`. Build, test, publish, and repair loops were not exercised. |
| Installed reference reads | On 2026-10-08, a fresh folder import of `78e9629` as an isolated `n8n-acceptance` power exposed exactly three entry skills. All 71 installed skill/helper/reference files matched the candidate. Kiro discovered the installed path without being given it and read the bundled router, lifecycle, node-configuration, expressions and Code-node guides during a real native MCP build. |
| Follow-up reference reuse | The wrong-output repair loaded only the debug entry skill and bundled debugging guide. The runtime-error repair read no new guidance. The earlier router and specialists were reused; unrelated guides and setup/recovery documentation stayed unloaded during the workflow tasks. |
| Update, reinstall and restart | On 2026-10-08, Kiro updated, uninstalled and reinstalled the isolated test power. Exactly three entry skills remained; all 71 installed skill/helper/reference files matched. Workspace MCP configuration and the helper registry stayed byte-for-byte unchanged. After a full IDE restart, native `get_workflow_details` succeeded with the saved grant, without new consent or registration, and confirmed the repaired unpublished draft. |
| Installed helper from the normal shell | The updated installed helper detected Kiro 1.2.37 and reused the registration with `changed: false`. Invocation from Kiro's agent terminal remains unverified; see the limitation below. |

### Native workflow results (2026-10-08)

Environment: Kiro 1.2.37 / macOS 27.0.1 / Node 24.19.0 against local n8n 2.42.0
development (`a4b87fccbe`), without changes to its OAuth implementation. The user
granted workflow read/write/execute and execution read.

Kiro created synthetic workflow `5ZIkSrjTdfhJEQdT` through native MCP using live
tool schemas. It remained unpublished and contained a Manual Trigger and an
arithmetic Code node, with no credentials or external integrations. No workflow
operation used REST or an externally supplied schema.

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
failure. Pinned testing is not recorded as passing.

The detailed September 25–28 investigation and test records are preserved at
[the reviewed commit](https://github.com/n8n-io/n8n-kiro-power/tree/20f9df620045dd0418e78f52459a5e2a413f6013/docs).
Their packaging statements describe those experiments, not the current package.

Known client issues: Kiro 1.2.37 returned no output and exit -1 even for
`node --version`; older sessions corrupted long terminal commands. Setup can use
the normal terminal, but automatic agent-terminal onboarding is not established.
Kiro also had transient MCP and own-auth/model timeouts during this run while
local n8n remained healthy; restarting Kiro cleared them. These are limits of the
observed client session, not evidence of an n8n OAuth failure.

## Acceptance gates

Use a development instance and synthetic data. Record the candidate commit,
Kiro/OS/n8n versions, hosting model, result, and any skipped checks. Keep tokens,
passwords, and private payloads out of evidence.

- [x] **Local connection:** fresh folder import, installed helper run from the
      normal shell, OAuth consent and authenticated native read, without editing
      JSON or copying a token.
- [x] **Core workflow acceptance:** create and run a draft, inspect and repair
      wrong output and a runtime error, and confirm the final outputs through
      native MCP. Kiro automatically found the bundled guides, exposed only the
      three entry skills, and reused relevant guidance during follow-up work.
      The manual-execution fallback and its limits are recorded above.
- [x] **Local update/reinstall and restart:** preserve the workspace connection
      and settings, and verify a read after a full IDE restart without new consent
      or another registration.
- [ ] **Public repository import:** clean installation from the GitHub repository
      URL at the release commit, followed by connection setup and a native read.
- [ ] **Agent-terminal onboarding:** invoke the installed helper successfully
      from Kiro's agent terminal with Node available in its environment.
- [ ] **Supported servers:** complete public OAuth and workflow operations on
      Cloud and a released self-hosted n8n version without the Basic-authentication
      patch. Establish the oldest verified release; the Cloud read alone does not
      complete this gate.
- [ ] **Context recovery:** after actual compaction, verify missing guidance is
      loaded again. The Kiro 1.2.4 `/compact` attempt produced an ordinary assistant
      summary, with no visible compaction event.
- [ ] **Access and effects:** respect a read-only grant and unavailable workflows;
      distinguish simulated data from real integrations and obtain authorization
      for actual external effects. Do not publish a workflow merely to test it.
- [ ] **Remaining connection lifecycle:** verify user settings across projects,
      token expiry/revocation and replacement-registration refresh with the
      installed package. Earlier experiments do not complete this gate.
- [ ] **IDE platform coverage:** verify Kiro on each platform claimed as supported;
      cross-platform helper CI does not replace these tests.
- [ ] **Legacy migration:** verify removal of old bundled duplicates without
      disturbing separately managed OAuth or token connections.

## Release order

1. Complete the remaining acceptance checks above against the release commit on
   `main`, including a clean import of the public repository URL. PR #2 is already
   merged. There is no npm publication or hosted service deployment.
2. Confirm the maintainer, durable monitored email, and authorized submitter.
   Have that representative review and accept the publisher terms.
3. Check the [current submission requirements](https://kiro.dev/powers/submit/)
   and submit the public repository URL. Record the submission date and outcome;
   submission or listing approval is not yet recorded in this checklist.

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
