# Shipping public-client OAuth

Status: implementation in progress, 2026-09-28. The setup helper, bundled script,
skill integration and automated tests are implemented locally. Compatibility and
release acceptance gates below remain open; see the [helper guide](setup-helper.md).

## Decision and scope

Ship a skills-only n8n power with a bundled, one-time setup helper. The helper
registers a public OAuth client with the user's n8n instance and configures a
native Kiro MCP connection. Kiro handles browser authorization, PKCE, token
storage, and refresh. No n8n OAuth changes are required for this approach.

The intended onboarding is:

1. Install the power and ask Kiro to connect to n8n.
2. Supply the instance URL. The helper discovers its OAuth configuration,
   registers the client, and writes the connection settings.
3. Use Kiro's Authenticate action, sign in to n8n, and approve permissions.
4. Kiro makes a read-only MCP call and confirms the connected instance.

An administrator must already have enabled instance-level MCP. Users should not
need to copy tokens or edit JSON on the normal path. Retain MCP access-token
authentication as a documented, explicitly selected fallback.

The initial scope is local Kiro IDE sessions and n8n workflow tools. Remote Kiro
sessions and preview n8n Agents are outside this release. The independent
[HTTP Basic authentication fix](https://github.com/n8n-io/n8n/pull/39637) can
continue separately; it is not a dependency of this plan.

## Evidence and remaining uncertainty

The [public OAuth acceptance report](public-oauth-acceptance.md) records a real
browser sign-in and consent flow with Kiro 1.1.70 and local n8n 2.41.0 development,
with the Basic-authentication patch removed. Public registration, S256 PKCE,
tool discovery, power activation, workflow creation, execution, and result
retrieval passed. Reload and rejected-token recovery also passed. The browser
test produced execution `2` with output `{"message":"KIRO","doubled":14}`.

That proves the connection approach. It does not validate a production installer
or every supported deployment:

| Area | Shipping work still needed |
| --- | --- |
| Installation | Real GitHub import, bundled helper execution, Node availability |
| Configuration | User-level settings, workspace overrides, multiple instances/windows |
| OAuth compatibility | Cloud, released self-hosted versions, callback differences, permission requests |
| Recovery | Full application restart, actual token expiry, occupied callback port |
| Workflow functionality | Native-MCP update and debug without an externally supplied schema |

The existing n8n 2.34.0 requirement is a tool-name compatibility floor, not a
verified public-OAuth support floor. Test it or raise it to the oldest verified
release. Preserve the historical results in the existing reports.

## Implementation contract

### Packaging and ownership

Remove the bundled placeholder `mcp.json`. Keep `plugin.json` and the three
skills. Kiro supports skills-only powers and scripts within a skill, so put the
generated helper at `skills/connect-n8n/scripts/setup.mjs`.
[Kiro power structure](https://kiro.dev/docs/powers/create/)

Use Node.js 22 or newer, with plain ESM source under `src/setup/`. Bundle pinned
dependencies into the shipped script so end users need no package installation.
Use `jsonc-parser` for configuration edits and esbuild for the distributable;
commit the package lockfile and generated script. Verify reproducible generation
in CI. Confirm Node is discoverable from a GUI-launched Kiro before claiming
this is frictionless. If it is absent, show an actionable prerequisite and leave
settings unchanged. Do not download or execute an unpinned runtime.

The portable Agent Plugins MCP schema has no OAuth-client settings. Keep
Kiro-specific OAuth fields in Kiro's native configuration, outside the power.
Do not assume plugin subprocess variables are available to skill scripts.
[Agent Plugins MCP rules](https://agent-plugins.org/specification#72-mcp-servers)

| Component | Responsibility |
| --- | --- |
| Power skills | Guide setup, select the intended connection, use advertised MCP tools |
| Setup helper | Discovery, public registration, callback selection, configuration and repair |
| Kiro | Browser authorization, PKCE, token exchange, credential storage and refresh |
| n8n | Login, consent, permissions, workflow access and execution |

The helper must not contain the acceptance fixture's account bootstrap or REST
consent harness. It must not handle passwords or tokens, access Kiro's credential
store, enable instance MCP, or implement a second OAuth callback server.

### Native configuration and persistent state

Default to `~/.kiro/settings/mcp.json`, allowing one connection to work across
projects. Offer explicit workspace scope. Kiro gives workspace settings
precedence; detect an overriding entry before claiming configuration is effective.
Supplying `oauth.clientId` lets Kiro use the registered public client without a
client secret. [Kiro MCP configuration](https://kiro.dev/docs/mcp/configuration/)

Use a stable server name derived from the normalized endpoint, with an optional
friendly name. Never reuse an unrelated entry by name alone. Multiple instances
must remain distinct, and the skills must resolve the intended instance before
any operation, particularly writes.

Implementation finding: Kiro 1.1.70 ignores `oauth.clientId` in its credential
cache key. The helper now adds a nonsecret `X-N8N-Kiro-Connection` header derived
from the public client ID to isolate registrations. A live test confirmed this
caused fresh consent and a successful PKCE exchange instead of reusing an older
localhost grant. Keep this workaround in the tested Kiro adapter and verify it
again when extending version support.

Store registration metadata at `~/.kiro/n8n-power/connections.json`: endpoint,
issuer, client ID, exact callback URI, managed server name, configuration scope,
helper schema version, and a fingerprint of managed fields. Keep this outside
the installed power and repository so updates do not erase it. It contains no
client secrets, authorization URLs, codes, or tokens.

Implement these operations:

| Operation | Behavior |
| --- | --- |
| `configure` | Discover, reuse or create registration, merge settings; report awaiting authorization |
| `doctor` | Inspect configuration, discovery and callback availability; no registration or authenticated calls |
| `repair` | Explain the observed fault, replace invalid registration or callback configuration when requested |
| `remove` | Remove only the managed connection; explain how to revoke its grant in n8n |

Support `--url`, `--name`, `--scope`, explicit workspace path, callback-port
override, `--dry-run`, and structured `--json` output. Dry-run performs no
registration or file writes. Diagnostics must distinguish configured,
authorization required, and verified connected; only a successful Kiro MCP read
establishes the last state.

### Discovery, registration and callback behavior

Accept an instance base URL or full MCP endpoint, preserving deployment base
paths. Follow the server's MCP authorization discovery, validate its issuer,
and use its advertised registration endpoint. Require HTTPS remotely; permit
HTTP loopback for local development. Reject embedded credentials and malformed
URLs. Bound request time, response size and redirects. Initially support n8n's
ordinary same-origin authorization server; report unsupported issuer layouts
explicitly rather than silently sending registration data elsewhere.

Register with `token_endpoint_auth_method: "none"`, authorization-code and
refresh-token grants, response type `code`, a recognizable client name, and the
exact selected loopback callback. Validate the response and reject an unexpected
client secret or different authentication method. Kiro must subsequently use
S256 PKCE and omit secret-based authentication; verify this in acceptance tests.

Reuse registrations for the same endpoint, issuer and callback. Persist a
successful registration before committing Kiro settings so a failed file write
can resume without registering again. Do not blindly retry registration after
an ambiguous timeout: the server may already have created the client. Report
that outcome and allow an explicit retry. Handle registration limits without
deleting other clients. Do not assume a registration-update or deletion API is
available without browser authentication.

Callback configuration needs a tested adapter. Installed Kiro 1.1.70 required
`oauth.redirectUri: "localhost:<port>"` while n8n registered
`http://localhost:<port>/oauth/callback`. Current Kiro documentation also describes
full-URL support. Establish behavior per supported Kiro version before writing
settings; do not extrapolate the documentation to an older build.

Select a free loopback port on first setup and preserve it on reruns. A temporary
bind check must release the port before Kiro can listen; it cannot guarantee
the port stays free. Diagnose later collisions and offer repair with a new
registration and authorization. An existing Kiro callback listener must not be
misdiagnosed as a collision. Test concurrent windows and instances. Respect
instance callback policies instead of broadening them.

Set the MCP timeout to 300,000 ms, as tested. When authorization expires, direct
the user to start a fresh Kiro flow. Do not save or reopen stale authorization
URLs. A 401 can indicate normal authorization is needed; a 404 or HTML response
can indicate a path, proxy or disabled feature. Avoid diagnosing MCP as disabled
from status code alone.

### Permissions and configuration safety

Start with `workflow:read`, `workflow:write`, `workflow:execute`, and
`execution:read`. Test the documented nested `oauth.oauthScopes` setting first.
The tested top-level setting did not limit Kiro's request: it requested all 16
scopes, and the consent UI defaulted to All. Do not present scope restriction as
solved until the actual authorization request and granted scopes confirm it.

If the supported client still requests all scopes, explain the Custom selection
in onboarding and test selecting the four permissions. Respect read-only grants;
request additional permissions only when a task requires them. OAuth grants do
not override n8n user/project permissions or workflow exposure settings.

Preserve comments, unknown fields and unrelated MCP entries. Use minimal edits,
restricted-permission backups, and atomic file replacement. Lock helper writes
and recheck the file before committing to detect external edits. Stop on invalid
JSON, unmanaged name conflicts or unexpected symlinks. Never dump the existing
configuration into logs: other entries may contain secrets. Repair and removal
must verify ownership and preserve subsequent user edits.

## Delivery sequence

### 1. Establish the supported configuration

Use disposable accounts and configurations to resolve these questions before
building the installer around assumptions:

- Verify public OAuth on an unpatched n8n Cloud instance and released self-hosted
  n8n. Include Cloud 2.39.6 if still available, or record its replacement version.
- Verify user-level native settings, workspace precedence, callback syntax,
  nested scope settings, credential reuse and simultaneous Kiro windows.
- Import a minimal skills-only power from GitHub and invoke a bundled script
  using its actual installed path, including paths containing spaces.
- Repeat create, deliberately break, inspect execution, update, and rerun using
  native MCP. No externally supplied tool schema is allowed.

**Exit:** a recorded Kiro/n8n support matrix, verified configuration fixtures,
permission behavior, and an end-to-end native update/debug result. If Kiro still
omits required nested schemas, resolve that client limitation or hold the full
build/run/debug release; OAuth success alone cannot clear this gate. See the
[schema investigation](kiro-tool-schema-compatibility.md).

### 2. Build and test the setup helper

Implement the contract above in small modules for discovery, registration,
Kiro compatibility, config/state storage and command handling. Add a fake OAuth
server and temporary-directory tests with Node's test runner. Build the bundled
artifact and test that artifact, not only source modules.

Cover initial setup, JSONC preservation, repeated setup with zero additional
registrations, multiple instances, workspace overrides, malformed discovery,
registration timeouts, callback denial/collision, invalid-client repair, state
corruption, concurrent edits, write failure and resume, and removal after user
edits. Verify error output excludes credentials and existing config contents.

**Exit:** deterministic tests pass on macOS, Linux and Windows; the distributable
runs without `node_modules`; repeat setup leaves unchanged config bytes alone.

### 3. Integrate the power and migration

| File or area | Planned change |
| --- | --- |
| `plugin.json` | Describe public-OAuth setup; set release version and verified requirements |
| `mcp.json` | Remove the bundled placeholder connection |
| `skills/connect-n8n/SKILL.md` | Invoke installed helper; guide native Authenticate and permission selection; verify a read |
| Build/debug skills | Select the managed native connection; use actual advertised schemas and permissions |
| `src/setup/`, `test/setup/` | Helper modules, compatibility fixtures and regression tests |
| `package.json`, lockfile, build script | Pinned development dependencies and reproducible helper bundle |
| `skills/connect-n8n/scripts/setup.mjs` | Committed distributable executable through Node |
| `README.md` | URL-to-consent onboarding, runtime prerequisite, migration, privacy, support and token fallback |
| Release and compatibility docs | Separate current public-OAuth status from historical Basic-authentication results |
| `.github/workflows/validate-power.yml` | Manifest/skill validation, OS test matrix, bundle reproducibility and packaging checks |

Replace instructions that require editing an installed power's `mcp.json`,
forbid native user settings, or depend on a `power-*` server name. Preserve the
rule that missing tools do not mean an empty instance. Workflow operations still
use MCP; token fallback is a connection choice, not a switch to the REST API.

For existing installations, confirm the old endpoint, create and authenticate
the new connection, and verify a read before removing the old bundled entry.
Test Kiro's supported update/reinstall flow to ensure it removes that entry and
does not leave duplicate servers. Do not overwrite an existing token-based or
user-created connection. Unlinking locally must not be described as server-side
revocation; document n8n's Connected clients controls.

Update CI intentionally for a package without `mcp.json`; retain portable-schema
validation for any portable MCP examples or fixtures. Add checks that the helper
is actually included and no generated registration/config files enter the package.

**Exit:** folder and GitHub installs complete setup without manual JSON edits;
power update/reinstall preserves the native connection and unrelated settings.

### 4. Validate the release candidate and publish

Record exact power commit, Kiro and extension versions, OS, n8n version and
hosting model for each acceptance run. Use a clean config without cached tokens.

| Test group | Required evidence |
| --- | --- |
| Clean onboarding | GitHub import → helper → real browser login/consent → successful MCP read |
| Workflow tasks | Validate, create, execute, inspect, repair and rerun; correct output without injected schemas |
| Permissions | Read-only grant prevents writes; workflow exposure and missing scopes are diagnosed correctly |
| Persistence | Window reload and full IDE exit/relaunch reconnect; helper no longer needs to be running |
| Token lifecycle | Actual expiry, or controlled short-lived tokens, refreshes; revocation leads to the correct recovery flow |
| Recovery | Browser cancellation/timeout, occupied callback port, removed client registration, offline server |
| Package lifecycle | Update, reinstall and explicit removal; other connections and subsequent user edits preserved |

Run real IDE OAuth on every OS advertised as supported; CI filesystem tests are
insufficient. Verify the oldest claimed n8n version and current stable releases,
with at least one Cloud and one self-hosted deployment. Test Kiro 1.1.70 if it
remains supported and the stable version at release time. Document any untested
SSO, private-CA or reverse-proxy configurations instead of claiming coverage.

After candidate tests pass, merge the package into the public default branch
and repeat import from the exact repository URL in the application. Confirm the
durable support contact, repository maintainer and authorized submitter, then
complete the listing submission. Kiro requires a tested, working power, stable
MCP services and README privacy/support information.
[Submission requirements](https://kiro.dev/powers/submit/)

**Exit:** the [release checklist](release-checklist.md) references evidence for
the actual public package; remaining unsupported configurations are explicit.

## Release decision

Public-client OAuth is the primary path once the helper and release gates pass.
Its benefit is browser consent and Kiro-managed credentials without manual token
transfer. Its maintenance cost is registration, callback/version compatibility
and safe native configuration. The
[token approach](token-auth-acceptance.md) remains the fallback where registration
or callback policy prevents OAuth.

Ship only when Cloud/self-hosted compatibility, installed-power setup, reliable
workflow repair, and lifecycle recovery are demonstrated. The existing local
success supports proceeding with implementation; it does not yet make the
current package ready for the public listing.
