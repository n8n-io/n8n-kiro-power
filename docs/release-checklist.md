# Release checklist

**Status: draft candidate.** This is the single current release checklist.
The [setup guide](setup-helper.md) describes the implemented commands.
The package contains skills and a bundled helper; it ships no root `mcp.json`.

Setup currently supports local Kiro IDE 1.1.70 with Node.js 22+. n8n 2.34.0 is
the workflow tool-name floor, not a verified public-OAuth minimum.

## Recorded evidence

| Check | Evidence and limits |
| --- | --- |
| Helper regression tests | On 2026-09-29, all 43 tests passed locally. Seven new regression cases failed against `20f9df6` and pass with the fixes. |
| Cross-platform CI | `20f9df6` passed Node 22/24 on macOS, Linux, and Windows plus manifest validation. Check the candidate commit's CI before release; helper tests do not establish IDE support on every OS. |
| New helper and OAuth | On 2026-09-28, Kiro 1.1.70 completed fresh S256 PKCE consent with a helper-created public client, discovered 23 tools, and called `search_workflows` successfully. Target: isolated local n8n 2.41.0 development without the Basic-authentication patch; disposable workspace configuration. |
| Earlier public-OAuth proof | Synthetic workflow creation/execution, refresh, revocation, and reconnect passed locally before the final helper was packaged. This is not installed-package acceptance. |
| Cloud | Discovery dry-run passed. Browser authorization and MCP operations with the new helper remain unverified. |

The detailed September 25–28 investigation and test records are preserved at
[the reviewed commit](https://github.com/n8n-io/n8n-kiro-power/tree/20f9df620045dd0418e78f52459a5e2a413f6013/docs).
Their packaging statements describe those experiments, not the current package.

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
- [ ] **Workflow acceptance:** create a draft, run it, introduce wrong output
      and an execution error, inspect the relevant runs, repair, and rerun through
      native MCP without an externally supplied schema. Confirm final outputs.
- [ ] **Access and effects:** respect a read-only grant and unavailable workflows;
      distinguish simulated data from real integrations and obtain authorization
      for actual external effects. Do not publish a workflow merely to test it.
- [ ] **Connection lifecycle:** verify user settings across projects, full IDE
      restart, token expiry/revocation, and replacement-registration refresh.
      Verify Kiro on each platform claimed as supported.
- [ ] **Update/migration:** update and reinstall the skills-only power; preserve
      native connections and unrelated settings, remove old bundled duplicates,
      and verify a read without another registration.

## Release order

1. Complete acceptance and review [power PR #1](https://github.com/n8n-io/n8n-kiro-power/pull/1).
   Merge it to `main`, then verify a clean import of the public repository URL at
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
