# Release validation and submission

The compatibility floor is n8n 2.34.0 because the skills use the tool names
introduced in that version. Use current stable patch releases for live testing.
Standalone n8n Agents are in Preview and are outside the release scope.

## Current public-OAuth candidate

The package now contains a setup helper and skills, with native Kiro MCP
configuration instead of bundled `mcp.json`. Its 36 tests, standalone bundle,
localhost registration/reuse, fresh browser consent, PKCE exchange and actual
Kiro MCP read passed on 2026-09-28. A read-only Cloud discovery dry-run also
passed; this is not a Cloud sign-in test. See the
[helper acceptance report](setup-helper-acceptance.md), [helper guide](setup-helper.md) and
[implementation plan](public-oauth-implementation-plan.md).

The CI matrix covers Node 22/24 on macOS, Linux and Windows; use the candidate
commit's GitHub checks for its result. Real IDE testing is still required on advertised
platforms. GitHub import, update/reinstall, full restart, expiry and native
workflow repair remain release gates. Historical evidence below describes the
older package and does not establish acceptance of the new installer.

### Pull requests and release order

The power ships through [power PR #1](https://github.com/n8n-io/n8n-kiro-power/pull/1)
into `main`, the repository's default branch. Keep the implementation and its
release evidence in that PR; a second power PR is unnecessary.

[n8n PR #39637](https://github.com/n8n-io/n8n/pull/39637) separately fixes HTTP
Basic client authentication. Public-client OAuth does not depend on that patch
or a new n8n release. Review it on its own merits; merging it is not a power
release prerequisite.

Complete the registry release gates below, review the power PR, and merge it
to `main`. Then smoke-test a clean import of the public repository URL at the
merged commit. Confirm the publisher/contact details and submit the repository
through the [Kiro submission form](https://kiro.dev/powers/submit/). This package
is distributed through GitHub; there is no npm publication or hosted service
to deploy.

## Historical validation of the bundled power

| Check | Result |
|---|---|
| Agent Plugins manifest and MCP schemas | Passed locally on 2026-09-25 with check-jsonschema 0.38.0 |
| Skill frontmatter, local links, README JSON example, and workflow schema | Passed locally on 2026-09-25 |
| Current-format folder import and skill activation | Passed in Kiro 1.1.70 on 2026-09-25; see the live run below |
| OAuth and a successful MCP read | Passed against locally patched n8n master; Cloud 2.39.6 still fails with missing `client_id`; see [investigation](oauth-compatibility.md) |
| Build, simulated test, and real integration | Synthetic draft built; simulated and real manual runs passed locally after a fix; external integration not run |
| Debug and authorization failure cases | Data-shape failure diagnosed and repaired with a supplied operation schema; limited-grant and revoked-access cases not run |
| Local update installs changed skills and intended URL | Passed through Check for updates > Install updates; authenticated reconnect after Reload Window passed locally; reinstall not verified |

Earlier testing of the legacy `POWER.md` package does not validate this
`plugin.json` package. Passing schema checks does not prove a working connection.
These local checks cover the package in this PR; repeat them after file changes
and use the CI result for the exact commit being released.

### Live run: 2026-09-25

- **Package:** `cef47855b442d5d24a8e0768db9e814c007d026c`, copied to a temporary
  folder with only the instance URL changed. The repository keeps its placeholder.
- **Client:** Kiro IDE 1.1.70, macOS 27.0, Apple Silicon; local IDE session.
- **Target:** existing n8n Cloud instance, version 2.39.6 reported by the user.
- **Tester:** automated UI checks in the maintainer's desktop session; OAuth
  sign-in and consent handed to the maintainer.
- **Import:** **Add Custom Power > Import power from a folder** succeeded.
  The detail page showed all three skills and the manifest description.
- **Configuration:** **Open powers config** opened the installed `mcp.json`,
  whose URL matched the configured source copy. Installation copies the folder;
  it does not edit the source package or the ordinary user MCP configuration.
- **Activation:** a read-only smoke-test prompt activated the power and loaded
  `connect-n8n`. The MCP server was named `power-n8n-power-n8n` because the import
  folder was named `n8n-power`. The initial connection returned `Unauthorized`
  and exposed no tools. The agent did not fall back to REST or an API key.
- **Authorization:** **Kiro > MCP Servers > Authenticate** started OAuth dynamic
  client registration and Kiro's external-website prompt. The requested scopes
  included workflow read/write/execute, execution and credential reads, project
  and data-table reads/writes, and tag reads. The user subsequently completed
  browser authorization and supplied the success page. Kiro then failed with
  `Invalid input: expected string, received undefined` at `client_id`.
- **Timeout recovery:** the first attempt timed out after 60 seconds; the user
  saw an expired/already-completed authorization request. **Retry** returned the
  server to **Unauthenticated** and **Authenticate** started a fresh browser
  request. Two attempts timed out. A later attempt completed the browser step
  within the timeout and exposed the separate token-exchange failure above.
- **Compatibility diagnosis:** synthetic invalid-client probes reproduced the
  same `client_id` error for HTTP Basic authentication. Body-based client
  authentication reached client lookup. See the [evidence and reproduction](oauth-compatibility.md).
  Retrying Kiro after browser success returned to **Unauthenticated**.
- **Remaining:** a successful token exchange and read, workflow tests,
  failure cases, authenticated reconnect, preservation of edits made only to
  the installed configuration, and GitHub import.
  No workflow or execution was created during these checks.
- **Local update:** after changing the source folder's connection skill and
  adding the compatibility report, **Check for updates > Install updates**
  succeeded. The installed files matched the source and the installed MCP URL
  still matched the configured source URL. This does not establish whether
  edits made only to the installed configuration survive replacement.

The smoke test exposed two onboarding gaps now addressed in the instructions:
activation may require a separate **Authenticate** action, and missing tools
must not cause the agent to assume the configured URL is still a placeholder.

### Local server-fix verification: 2026-09-25

- **Client/package:** the same installed Kiro 1.1.70 power, with its URL changed
  to `http://localhost:5681/mcp-server/http`.
- **Server:** n8n master `8ccb6cd0a05` (2.41.0 development), with the local OAuth
  Basic-authentication middleware patch described in the
  [compatibility investigation](oauth-compatibility.md). Separate development
  data directory; the maintainer created the owner and completed OAuth consent.
- **OAuth:** the actual Kiro authorization-code exchange used Basic
  authentication and returned HTTP 200. Only request metadata was logged.
- **Discovery/read:** Kiro showed **Connected (55 tools)**. Power activation and
  loading `connect-n8n` succeeded. The recorded `search_workflows` tool response
  was `{"data":[],"count":0}` for `limit: 5`.
- **Reconnect:** **Developer: Reload Window** automatically restored the
  connection without new consent. A second workflow search succeeded. No
  expired-token refresh was observed in Kiro; refresh rotation and revocation
  passed in the server integration tests.
- **Build:** Kiro loaded `build-workflow`, read the synthetic workspace's
  `route.ts`, retrieved SDK and node references, validated, and created
  unpublished workflow `ZtvfTeWxT3mwwrz8` (**Kiro Power Local Smoke Test**).
- **Debug:** the initial simulated execution `1` succeeded, but real manual
  execution `2` failed because Kiro omitted the requested sample-input node.
  The trigger emitted `{}` and the calculation produced `NaN`. Kiro loaded
  `debug-execution` and diagnosed the error from `includeData: true` results.
- **Client limitation:** Kiro guessed an unavailable reference tool and later
  invalid update fields. The saved activation text omitted the nested operation
  schema. After a server-derived schema was supplied in the synthetic workspace,
  Kiro used `update_workflow` to insert a pure Set node and rewire the graph.
  All four operations applied with no validation warnings. This was an assisted
  test; see the [schema compatibility report](kiro-tool-schema-compatibility.md).
- **Final execution checks:** simulated execution `3` and real manual execution
  `4` both succeeded. Kiro retrieved both with `includeData: true`; each returned
  `{"message":"KIRO","doubled":14}` from the transformation, matching `route.ts`.
  The real manual run began with an empty trigger item and obtained its input
  from the new Set node. Both Set nodes executed; the final workflow has no
  credentials, network calls, file operations, or saved pin data.
- **Scope:** the workflow remains unpublished. No external integration,
  production webhook, or production execution was tested. The supplied schema
  is a local test aid and is not part of the power package.
- **Release limit:** this is an uncommitted server patch, not a released n8n
  version. The tested Cloud instance has not received the fix.

## Package checks

The **Validate power** workflow checks the manifest against Agent Plugins 1.0.0
and runs the helper tests, bundle reproducibility and package checks. There is
no portable MCP config in the skills-only package. To check the manifest with
Python 3.10 or later, create a virtual environment outside the repository:

```sh
python3 -m venv /tmp/n8n-power-validation
/tmp/n8n-power-validation/bin/python -m pip install check-jsonschema==0.38.0
/tmp/n8n-power-validation/bin/check-jsonschema --schemafile https://agent-plugins.org/schemas/1.0.0/plugin.schema.json plugin.json
```

Run `npm ci --ignore-scripts` and `npm run check` for helper and package checks.

Also check skill frontmatter and relative links when changing skills. The
[Agent Skills specification](https://agentskills.io/specification) defines the
required names, descriptions, and metadata types.

## Live test procedure

Use a development instance and synthetic data. Record the power commit, Kiro
version, OS, n8n version, Cloud or self-hosted deployment, date, and tester for
each run. Record workflow and execution IDs without tokens, credentials, or
private payloads. Test both hosting models before advertising both as verified.

1. **Import and activate.** Import the candidate package into Kiro. Ask it to
   connect to a development n8n URL. Confirm that it loads `connect-n8n`, runs the
   bundled helper, and discovers the named native MCP server without editing JSON.
2. **Authorize and read.** Complete the OAuth browser round trip. Confirm that
   a read-only request succeeds and that the client appears in n8n's Connected
   clients list. Capture the actual connection and reconnect steps.
3. **Check a limited grant.** Connect with read-only permissions. Ask for a
   workflow change. Confirm that no write occurs and that Kiro explains the
   missing permission. Reconnect with the permissions needed for the next steps.
4. **Build and test logic.** Ask Kiro to use a sample route and request type from
   the workspace to create an unpublished workflow. Verify node discovery,
   validation, saved workflow content, and a pinned test. Confirm that Kiro
   names simulated nodes and does not claim the real API was tested.
5. **Check a real integration.** Use a harmless development endpoint with a
   known response. Authorize the specific request. Run the draft with an explicit
   manual execution mode and inspect the final execution data. If testing a
   production webhook, authorize publication separately and verify its real URL.
6. **Debug.** Introduce a deliberate data-shape error in the test workflow.
   Confirm that Kiro reads execution data with `includeData: true`, identifies
   the failing node and version, applies the fix, and reports actual test
   coverage. A fix to a draft must not be described as deployed to production.
7. **Check test effects.** Use an unpinned node that writes only a disposable test
   file on the n8n execution host, if that node is available. Confirm that Kiro
   explains the effect before running it and respects a refusal. Confirm that
   pinning the node avoids that effect. Record skipped cases and their reason.
8. **Check workflow exposure.** Leave a test workflow unavailable in MCP. Confirm
   that a search preview does not lead Kiro to claim it can inspect or execute
   it. Enable access through n8n and retry with the same client grant.
9. **Check failure handling.** In separate disposable configurations, use an invalid
   or unreachable development URL, occupy the callback port, and revoke
   the test client's OAuth access. Confirm that Kiro reports the observed cause,
   does not guess another host, and does not silently switch authentication or use the REST API.
   Where possible, disable builder tools or tags to verify the feature diagnosis.
10. **Reinstall and update.** Update/reinstall the skills-only package. Confirm
    the native connection and unrelated settings survive, the old bundled server
    is absent, and a read succeeds without registering another client.

## Registry release gates

- [ ] Verify the public-OAuth helper and token exchange on the supported Cloud
      and released self-hosted versions without the server Basic-authentication patch.
- [ ] Resolve Kiro's [omission of nested tool schemas](kiro-tool-schema-compatibility.md)
      and repeat workflow updates without an externally supplied schema.
- [ ] Record successful live results above, including any supported-version limits.
- [ ] Confirm the registry/GitHub import flow and document how users configure the
      instance URL in that flow. Folder import is the current candidate procedure.
- [ ] Merge the release package to the public repository's default branch, then
      verify that importing the repository URL loads the intended version.
- [ ] Confirm the repository maintainer and a durable, monitored contact address.
- [ ] Have an authorized n8n representative review and accept the publisher terms.
- [ ] Complete the submitter's first and last name and email in the form.

Submitting accepts the [Kiro Powers Publisher Terms](https://kiro.dev/powers/terms/).
These include marketing rights for the publisher's name and logos, authority to
bind the organization, and support obligations after removal. Record the
organization's decision before submission.

## Application text

- **Organization:** n8n
- **Use case:** Build automation workflows
- **Repository:** https://github.com/n8n-io/n8n-kiro-power
- **Submitter name and contact email:** to be supplied by the authorized publisher

Suggested domain description:

> n8n is a workflow automation platform. This power connects Kiro to the built-in
> MCP server of a user's n8n Cloud or self-hosted instance. It helps developers
> build, run, and debug workflows using the routes, types, and configuration in
> their editor workspace. Access follows the user's n8n permissions, OAuth grant,
> and workflow exposure settings. Workflows remain normal n8n workflows that can
> be opened, edited, and run independently of Kiro.

Check the current [submission requirements](https://kiro.dev/powers/submit/)
before sending the application.
