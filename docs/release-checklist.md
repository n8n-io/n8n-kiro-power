# Release validation and submission

The compatibility floor is n8n 2.34.0 because the skills use the tool names
introduced in that version. Use current stable patch releases for live testing.
Standalone n8n Agents are in Preview and are outside the release scope.

## Validation status

| Check | Result |
|---|---|
| Agent Plugins manifest and MCP schemas | Passed locally on 2026-09-25 with check-jsonschema 0.38.0 |
| Skill frontmatter, local links, README JSON example, and workflow schema | Passed locally on 2026-09-25 |
| Current-format folder import and skill activation | Passed in Kiro 1.1.70 on 2026-09-25; see the live run below |
| OAuth and a successful MCP read | Browser flow started; awaiting user authorization; read not run |
| Build, simulated test, and real integration | Not run |
| Debug and authorization failure cases | Not run |
| Update or reinstall preserves the intended connection | Not run |

Earlier testing of the legacy `POWER.md` package does not validate this
`plugin.json` package. Passing schema checks does not prove a working connection.
These local checks cover the package in this PR; repeat them after file changes
and use the CI result for the exact commit being released.

### Live run: 2026-09-25

- **Package:** `cef47855b442d5d24a8e0768db9e814c007d026c`, copied to a temporary
  folder with only the instance URL changed. The repository keeps its placeholder.
- **Client:** Kiro IDE 1.1.70, macOS 27.0, Apple Silicon; local IDE session.
- **Target:** existing n8n Cloud instance; n8n version not yet verified.
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
  and data-table reads/writes, and tag reads. This is an authorization request,
  not evidence of a completed grant or working tools.
- **Timeout recovery:** the first attempt timed out after 60 seconds; the user
  saw an expired/already-completed authorization request. **Retry** returned the
  server to **Unauthenticated** and **Authenticate** started a fresh browser
  request. Successful completion of that retry is not yet verified.
- **Remaining:** consent, a successful read, version discovery, workflow tests,
  failure cases, authenticated reconnect, update behavior, and GitHub import.
  No workflow or execution was created during these checks.

The smoke test exposed two onboarding gaps now addressed in the instructions:
activation may require a separate **Authenticate** action, and missing tools
must not cause the agent to assume the configured URL is still a placeholder.

## Package checks

The **Validate power** GitHub Actions workflow checks both JSON files against
the official Agent Plugins 1.0.0 schemas. To repeat the checks locally with
Python 3.10 or later, create a virtual environment outside the repository:

```sh
python3 -m venv /tmp/n8n-power-validation
/tmp/n8n-power-validation/bin/python -m pip install check-jsonschema==0.38.0
/tmp/n8n-power-validation/bin/check-jsonschema --schemafile https://agent-plugins.org/schemas/1.0.0/plugin.schema.json plugin.json
/tmp/n8n-power-validation/bin/check-jsonschema --schemafile https://agent-plugins.org/schemas/1.0.0/mcp.schema.json mcp.json
```

Also check skill frontmatter and relative links when changing skills. The
[Agent Skills specification](https://agentskills.io/specification) defines the
required names, descriptions, and metadata types.

## Live test procedure

Use a development instance and synthetic data. Record the power commit, Kiro
version, OS, n8n version, Cloud or self-hosted deployment, date, and tester for
each run. Record workflow and execution IDs without tokens, credentials, or
private payloads. Test both hosting models before advertising both as verified.

1. **Import and activate.** Copy the package to a disposable local folder. Set
   its URL before importing, following the README. Ask Kiro to connect to n8n.
   Confirm that it loads `connect-n8n` and discovers the namespaced MCP server.
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
9. **Check failure handling.** In separate disposable configurations, leave the
   placeholder URL unchanged, use an unreachable development URL, and revoke
   the test client's OAuth access. Confirm that Kiro reports the observed cause,
   does not guess another host, and does not fall back to an API key or REST API.
   Where possible, disable builder tools or tags to verify the feature diagnosis.
10. **Reinstall and update.** Repeat import after changing the local folder's
    URL. Confirm the actual host in use and repeat a read call. Document whether
    OAuth must be repeated and whether Kiro retains or replaces configuration.

## Registry release gates

- [ ] Record successful live results above, including any supported-version limits.
- [ ] Confirm the registry/GitHub import flow and document how users configure the
      instance URL in that flow. The README currently documents folder import.
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
