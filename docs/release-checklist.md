# Release checklist

**Status: release import and setup verified; final native read blocked by Kiro's account usage limit.** Last reviewed 2026-10-19; full workflow acceptance run 2026-10-16.
[PR #3](https://github.com/n8n-io/n8n-kiro-power/pull/3) merged on 2026-10-19
as `f807c6f`, including the final name, description and guidance fixes.
The [setup guide](setup-helper.md) describes the implemented commands.
The package contains skills and a bundled helper; it ships no root `mcp.json`.

The initial release supports macOS only. Setup accepts local Kiro IDE 1.1.70,
1.2.4 and 1.2.37 with Node.js 22+. Support for newer Kiro versions is deferred;
version-specific live validation is recorded below. n8n 2.34.0 is
the workflow tool-name floor, not a verified public-OAuth minimum.

## Recorded evidence

| Check | Evidence and limits |
| --- | --- |
| MCP GA status | The [n8n 2.31 release notes](https://docs.n8n.io/changelog/release-notes/#n8n231), released 2026-07-14, explicitly identify instance-level MCP as generally available; [PR #34084](https://github.com/n8n-io/n8n/pull/34084), merged 2026-07-13, removed its Preview label for that reason. The current [tool reference](https://docs.n8n.io/connect/connect-to-n8n-mcp-server/mcp-server-tools-reference/) documents workflow management and builder tools separately from standalone agent management, which remains Preview and is outside this power's scope. GA status is separate from the power's version compatibility and acceptance checks. |
| Public repository import | On 2026-10-19, the earlier GitHub and folder test installations were uninstalled through Kiro 1.2.37, then `https://github.com/n8n-io/n8n-kiro-power` was imported through **Import power from GitHub**, without a checkout or branch override. Kiro displayed `n8n-workflow-dev`, the benefit-first description and exactly three entry skills. All 72 installed manifest/skill/helper/reference files matched public `main` at `f807c6f` (version 1.0.1). The October 16 import of `65bff7a` had separately passed skill activation, setup and a native read. |
| Final release connection | On 2026-10-19, the freshly GitHub-installed helper ran `configure` against the existing user-scoped Cloud connection with the actual running Kiro version, 1.2.37. It returned `registration: reused` and `changed: false`; no new registration or consent was created. Kiro displayed **Connected (55 tools)**. Both **Try power** and the explicit native-read request stopped before any agent/tool execution because the Kiro account had reached its monthly usage limit. The installed helper was therefore run from the normal shell. The final workflow read is unverified; connection status and tool discovery do not substitute for it. |
| Candidate metadata | On 2026-10-16, a separate folder import displayed `n8n-workflow-dev`, the 74-character benefit-first description, and exactly three entry skills in Kiro 1.2.37. Subsequent GUI updates installed the revised candidate; all three installed entry files matched the working tree before the final context-recovery test. |
| Merged release package | On 2026-10-19, the public archive of `f807c6f` was downloaded without GitHub authentication and checked in a clean directory. Its repository tree exactly matches reviewed candidate `b86b94e`. `npm ci --ignore-scripts` and `npm run check` passed: all 66 tests, bundle reproducibility, manifest, bundled references, Markdown links and documented commands. Native import and setup also passed as recorded above; the account-limited native read remains unverified. |
| Automated checks | All [eight validation jobs](https://github.com/n8n-io/n8n-kiro-power/actions/runs/39245374146) passed on merged release `f807c6f`: Node 22/24 on macOS, Linux and Windows, plus manifest and shared-snapshot checks. The clean-archive check also passed on macOS / Node 24.19.0. Helper CI does not establish IDE support on every OS. |
| Validator runtime | Both bundled validators and their full error-response expressions passed checks with the local n8n 2.43.0 expression runtime, including scalar bodies, invalid tags, unknown fields and a `__proto__` key. This was a separate expression-runtime check, not a live workflow test. |
| Local public OAuth | On 2026-09-28, Kiro 1.1.70 completed S256 PKCE consent with a helper-created public client and called `search_workflows` on local n8n 2.41.0 development without the Basic-authentication patch. The 2026-10-08 installed-power test completed OAuth and a native read on Kiro 1.2.37 / local n8n 2.42.0 development. |
| Released self-hosted server | On 2026-10-16, Kiro 1.2.37 completed public OAuth against the unmodified official n8n 2.43.7 image on loopback port 5691. The installed candidate created unpublished workflow `nrORVkMVRyddiPbB` with only a Manual Trigger and a pure arithmetic Code node. Native execution 1 returned A=45/B=27; deliberate wrong-output execution 2 returned 50/30; repair execution 3 returned 45/27; execution 4 failed with `KIRO_STABLE_ACCEPTANCE_FAILURE`; repair execution 5 returned 45/27. Native execution reads confirmed each result. No external integrations or credentials were used. This is the oldest released self-hosted version verified by this acceptance run. |
| Cloud | On 2026-10-16, Kiro 1.2.37 completed public OAuth and a native filtered workflow search against n8n Cloud 2.43.5, with the server version confirmed in its settings UI. The installed candidate read its own router, lifecycle, debugging and Code-node guides, then validated and created unpublished synthetic workflow `Z5IJT5W6kM5npyGS` with a Manual Trigger and pure arithmetic Code node. Native execution 579 returned A=45/B=27; deliberate wrong-output execution 580 returned 50/30; repair execution 581 returned 45/27; execution 582 failed with `KIRO_CLOUD_ACCEPTANCE_FAILURE`; repair execution 583 returned 45/27. Native execution reads confirmed every result. As on the local server, pinned testing failed on missing `pinData`; the guarded manual-execution fallback passed. No external integrations or credentials were used. |
| Installed reference reads | On 2026-10-08, a fresh folder import of `78e9629` as an isolated `n8n-acceptance` power exposed exactly three entry skills. All 71 installed skill/helper/reference files matched the candidate. Kiro discovered the installed path without being given it and read the bundled router, lifecycle, node-configuration, expressions and Code-node guides during a real native MCP build. |
| Follow-up reference reuse | In the October 8 run, the wrong-output repair loaded only the debug entry skill and bundled debugging guide. The runtime-error repair read no new guidance. The earlier router and specialists were reused; unrelated guides and setup/recovery documentation stayed unloaded during the workflow tasks. The October 16 context fix now requires the two core guides whenever a build/debug entry is loaded, while preserving reuse between operations. |
| Update, reinstall and restart | On 2026-10-08, Kiro updated, uninstalled and reinstalled the isolated test power. Exactly three entry skills remained; all 71 installed skill/helper/reference files matched. Workspace MCP configuration and the helper registry stayed byte-for-byte unchanged. After a full IDE restart, native `get_workflow_details` succeeded with the saved grant, without new consent or registration, and confirmed the repaired unpublished draft. |
| GitHub-installed helper and connection | On 2026-10-16, Kiro 1.2.37 found the installed setup guide and helper without being given their paths. Its agent terminal returned Node 24.19.0, ran `doctor`, and ran `configure` to restore the missing temporary workspace settings using the saved registration. Native `search_workflows` then returned results against local n8n 2.43.0 development (checkout `e8330bb815`), using the cached grant without fresh consent. No workflow was changed or run. |
| Expired-token refresh | The task's original access token was issued 2026-10-08 at 13:38 UTC and expired at 14:38 UTC. The October 16 native read produced a new access token and rotated refresh token at 14:32 UTC for the same client, without browser consent or another registration. Only issuance, expiry and scope metadata were inspected; token values are excluded from evidence. |
| Revocation and replacement | On 2026-10-16, revoking the disposable local grant in n8n caused the next native workflow search to receive HTTP 401 and return no workflow data. n8n deleted the registration after its last grant was revoked. The installed helper's `repair --new-registration` created a replacement public client; native OAuth, workflow creation, execution and repair then passed. Its initial access token expired at 18:08 UTC; a native `get_workflow_details` after 20:00 UTC returned the repaired unpublished workflow through that same connection, without another consent or registration. |
| User settings across projects | On 2026-10-16, a user-scoped Cloud connection authorized in one temporary project reconnected in the original project and completed a native filtered workflow search without another consent or registration. Two simultaneously open Kiro windows collided on its fixed callback port; the sequential reuse test passed after closing the idle test window. The setup guide documents the concurrent-window limitation and separate workspace registrations. |
| Access boundaries | On 2026-10-16, disabling MCP availability for the synthetic released-server workflow made native `get_workflow_details` return “Workflow is not available in MCP” with no workflow data. Kiro stopped without a bypass; MCP availability was then restored. The user confirmed accepting the earlier broad grants. A fresh Custom consent selected exactly `workflow:read`; n8n displayed only “List workflows”, and Kiro connected with 11 tools. Native `get_workflow_details` succeeded, and Kiro declined a requested synthetic edit because this connection exposed no write tools, without switching connections or expanding access. Its explanation confused workflow-level permissions with OAuth scopes; the connection guide now distinguishes them. Pure arithmetic runs establish no external-integration behavior. |
| Simulated effects | On 2026-10-16, a disposable unpublished local fixture `XRmdkWWWMVkLau0Z` contained a Manual Trigger and an HTTP POST with synthetic data to `https://example.invalid/kiro-acceptance`. Only simulation was authorized. Kiro read the testing guide, inspected the graph and prepared pin data, then called native `test_workflow` with an explicit pin for the HTTP node. Execution 6 succeeded; native execution data contained that HTTP pin and its supplied synthetic response, with no real HTTP request. Kiro left the real endpoint unverified. It overclaimed that the Manual Trigger was also pinned, although the saved pin map contained only the HTTP node; guidance now requires pin evidence rather than inferring simulation from an empty output. Unlike earlier calls, this call preserved the nested arguments. This verifies a bounded HTTP simulation, not consistent argument handling for every Kiro call or any real external integration. |
| Legacy migration | On 2026-10-16, uninstalling the original bundled-MCP power preserved user/workspace settings and the helper registry exactly; a subsequent native OAuth workflow read succeeded. A second GUI install/uninstall used the legacy format from `cef4785`, with a distinct fixture name and loopback URL. User/workspace settings and the registry remained byte-for-byte unchanged, including a disabled synthetic bearer-token entry. The separate token-test power remained installed. The temporary entry was then removed. This verifies configuration preservation, not authentication with a real bearer token. |
| Context recovery | On 2026-10-16, actual compactions at 15:08:58 and 17:45:53 UTC removed 279 and 158 messages respectively. Earlier recovery attempts reloaded entries but skipped their linked guides. The final fix requires reading the two core guides each time a build/debug entry is loaded, without a retained-context exception. After a GUI update, a normal debug-skill request in the already compacted chat passed on Auto: Kiro reloaded the debug and connection entries, recovered from an initial workspace-relative lookup, discovered the installed power, and read its `using-n8n-skills-official` and `n8n-debugging-official` files before diagnosing execution 4. The file links were verified against the correct installed paths. It reused the earlier native execution result and made no new workflow call, edit or run. This verifies recovery in that compacted chat; it is not a guarantee of every model's instruction adherence. |

### Native workflow results (2026-10-08)

Environment: Kiro 1.2.37 / macOS 27.0.1 / Node 24.19.0 against local n8n 2.42.0
development (`a4b87fccbe`), without changes to its OAuth implementation.
Although four workflow/execution permissions were reported during setup, an
October 16 inspection of the stored consent and token scope metadata showed a
broader grant from its initial issuance, including agent, credential, data-table,
project, tag and community-package scopes. These tests establish workflow
functionality, not least-privilege consent. The user subsequently confirmed
accepting the broad grants. A fresh October 16 read-only consent and native
permission-boundary test passed as recorded above.

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
failure. Pinned testing did not pass in that run; the separate October 16
HTTP-pinned fixture passed as recorded above.

The detailed September 25–28 investigation and test records are preserved at
[the reviewed commit](https://github.com/n8n-io/n8n-kiro-power/tree/20f9df620045dd0418e78f52459a5e2a413f6013/docs).
Their packaging statements describe those experiments, not the current package.

On 2026-10-08, Kiro 1.2.37 returned no output and exit -1 even for
`node --version`; older sessions corrupted long terminal commands. The
2026-10-16 agent-terminal check passed Node detection, helper invocation and a
native read, so the earlier failure did not reproduce. Keep the documented
normal-terminal fallback for affected sessions. The October 8 run also had
transient MCP and own-auth/model timeouts while local n8n remained healthy;
restarting Kiro cleared them. Their cause was not established.

## Acceptance gates

Use a development instance and synthetic data. Record the candidate commit,
Kiro/OS/n8n versions, hosting model, result, and any skipped checks. Keep tokens,
passwords, and private payloads out of evidence.

- [x] **MCP GA evidence:** record public sources confirming instance-level MCP
      is GA, distinguish workflow tools from standalone Agents Preview, and
      include the links in the review handoff.
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
- [x] **Public repository package import:** install the default branch directly
      from the GitHub URL on stable Kiro and verify its installed contents and
      three entry skills, then run setup and an authenticated native read.
      The October 16 test reused an existing grant; no PR checkout was needed.
- [x] **Merged repository package:** verify the public release archive and CI
      against `f807c6f`, including the final metadata and shared-guide fixes.
- [ ] **Final release import and connection:** the clean GitHub URL import of
      merged release `f807c6f`, installed-file comparison and helper setup passed
      on Kiro 1.2.37 on October 19. Only the native workflow read remains: Kiro
      rejected the request because the test account's monthly usage allowance
      was exhausted, before invoking any tool. Restore account usage and repeat
      that read through the existing Cloud connection; no new setup is needed.
- [x] **Agent-terminal setup:** invoke the installed helper successfully
      from Kiro's agent terminal with Node available in its environment.
- [x] **Supported servers:** complete public OAuth and workflow operations on
      Cloud and a released self-hosted n8n version without the Basic-authentication
      patch. Released self-hosted 2.43.7 and Cloud 2.43.5 passed OAuth, native
      reads, draft creation, manual execution, wrong-output repair and runtime-error
      repair. Earlier pinned calls failed on missing arguments; the separate
      HTTP-pinned fixture passed, with the limits recorded above.
- [x] **Context recovery:** verify the corrected loading policy after actual
      compaction. The final October 16 retest loaded both core shared guides
      from the installed candidate before diagnosing the recorded execution.
      The earlier failures and the retest's scope are recorded above.
- [x] **Access and effects:** respect a read-only grant and unavailable workflows;
      distinguish simulated data from real integrations and obtain authorization
      for actual external effects. Do not publish a workflow merely to test it.
      Unavailable-workflow rejection, narrow-consent behavior and a simulation-only
      HTTP test passed. The HTTP node remained pinned under an explicit prohibition
      on real requests, and the real integration was left unverified.
- [x] **Expired-token refresh:** verify a native read after expiry refreshes the
      saved grant without another consent flow or registration.
- [x] **Remaining connection lifecycle:** verify user settings across projects,
      revocation and replacement-registration refresh with the installed package.
      Cross-project reuse, revocation/replacement and a native read after the
      replacement access token's initial expiry passed.
- [x] **IDE platform coverage:** the initial release is explicitly limited to
      macOS, as agreed on October 16. Native installation, setup, OAuth, workflow
      operations and restart have been exercised on macOS 27.0.1. Windows/Linux
      helper CI does not establish support for their IDE flows.
- [x] **Legacy migration:** remove old bundled duplicates through Kiro while
      preserving separately managed OAuth and token configuration. Native OAuth
      access and exact configuration preservation passed as recorded above.

## Publication

The release package is available from the public repository's default branch.
There is no npm publication or hosted service deployment. The final native read
is blocked by the test account's Kiro usage allowance, as recorded above;
newer Kiro compatibility is outside this release.

The maintainer confirmed on 2026-10-19 that submission is handled separately.
Submission details, publisher terms and registry approval are owned by that
process; this repository does not claim a listing approval or require a second
submission. The [submission requirements](https://kiro.dev/powers/submit/) were
checked against the manifest, privacy/support links and MCP GA evidence.

[n8n PR #39637](https://github.com/n8n-io/n8n/pull/39637) separately fixes HTTP
Basic client authentication. Public-client OAuth does not require that PR or a
new n8n OAuth release.

## Application text

- **Power identifier:** `n8n-workflow-dev`
- **Description:** Build, run, and debug n8n workflows inside Kiro against your own instance.
- **Organization:** n8n
- **Use case:** Build automation workflows
- **Repository:** https://github.com/n8n-io/n8n-kiro-power
- **Submitter and contact details:** managed through the separate submission process

Suggested domain description:

> n8n is a workflow automation platform. This power connects Kiro to the built-in
> MCP server of a user's n8n Cloud or self-hosted instance. It helps developers
> build, run, and debug workflows using the routes, types, and configuration in
> their editor workspace. Access follows the user's n8n permissions, OAuth grant,
> and workflow exposure settings. Workflows remain normal n8n workflows that can
> be opened, edited, and run independently of Kiro.
