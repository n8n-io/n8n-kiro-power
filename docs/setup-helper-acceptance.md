# Setup helper implementation acceptance

Test date: 2026-09-28. This records local acceptance of the implementation
candidate, not registry-release approval. See the [implementation plan](public-oauth-implementation-plan.md)
for remaining gates and the [helper guide](setup-helper.md) for commands.

Tested bundled helper SHA-256:
`2db4acebf4ab264773510d795be5e0cc5c71aeb1527231096ad90e7382b7211c`.

## Automated checks

- `npm run check`: 36 tests passed on macOS with Node.js 24.19.0, including
  reproducible bundle generation and local Markdown/package checks.
- The bundle was copied outside the repository into a path containing spaces
  and Unicode, then executed without `node_modules`.
- Tests cover public registration, discovery validation, rejected/uncertain
  registrations, registration reuse, JSONC preservation, user edits, workspace
  overrides, two instances, occupied callback ports, symlinks, locks, concurrent
  writes, and resuming after initial/replacement config-write failures.
- Manifest validation passed against the official Agent Plugins 1.0.0 schema
  with check-jsonschema 0.38.0 on Python 3.12. Skill frontmatter and CI YAML also
  parsed successfully. The system Python 3.9 could not install that validator;
  validation used a temporary Python 3.12 environment.
- The Node 22/24 × macOS/Linux/Windows CI matrix runs on GitHub. Check the
  candidate commit's checks for its result; the local acceptance above preceded
  the first CI run. Helper tests do not establish real IDE support on other OSes.

## Real localhost connection

The generated bundle ran against the existing isolated n8n 2.41.0 development
instance at `http://localhost:5689`, whose Basic-authentication middleware had
been removed for the earlier [public OAuth test](public-oauth-acceptance.md).
The n8n working checkout and OAuth implementation were unchanged in this run.

The helper created a new public registration and wrote a disposable workspace
connection named `n8n-helper-acceptance`. Registration state was also redirected
to the temporary test directory through the programmatic test seam. This did
not edit the user's global MCP settings. A second configure call reused the
registration and left configuration bytes unchanged. Doctor reported
`configured_unverified`, as intended.

Kiro IDE 1.1.70 loaded that configuration. The first attempt unexpectedly reused
an earlier localhost grant, showing 23 tools without a new token exchange.
Inspection of the installed extension established that its OAuth cache key uses
the endpoint URL and headers but omits the configured public client ID.

The implementation now sets `X-N8N-Kiro-Connection` to a nonsecret SHA-256
identifier derived from that public client ID. After applying the updated
configuration and reloading the test window, Kiro showed Unauthenticated.
This demonstrates that the new registration was no longer borrowing the older
grant. The header stays stable on repeated setup and changes on client repair.

Authenticate then opened a fresh S256 PKCE flow. The real n8n consent page was
completed in the Codex browser using its existing disposable-account login.
Custom consent granted exactly workflow read/write/execute and execution read.
The workflow group also included tag read, which was explicitly deselected.
The browser displayed Authorization Successful.

The backend trace recorded the token exchange at `13:01:11.958Z`:

- HTTP 200 on `/mcp-oauth/token`.
- Authorization-code grant, client ID and PKCE verifier in the body.
- No Basic authentication and no client secret.
- Subsequent MCP discovery and tool listing returned HTTP 200; Kiro showed
  Connected with 23 tools.

Kiro then called `search_workflows` with `limit: 1` on the new native connection.
The tool call was approved once. At `13:04:46.411Z`, n8n returned HTTP 200. Kiro's
recorded successful tool result contained workflow `GQndlaIr7CTcAZK1`,
**Kiro Browser OAuth Acceptance Test**, with total count `2`. This was a read;
no workflow or execution was created or changed in this helper acceptance run.

The desktop automation occasionally returned stale accessibility state or timed
out. Token-exchange and MCP-call evidence comes from the server trace and Kiro's
completed tool result, in addition to browser consent and the connected-tool UI.
These automation problems are not classified as OAuth failures.

## Cloud discovery

A helper `configure --dry-run` against the previously supplied Cloud instance
passed resource discovery, exact issuer matching and the required public-client,
S256, authorization-code and refresh metadata checks. It performed no registration
and wrote no settings. Cloud browser authorization and MCP calls remain untested
with the new helper; discovery success must not be presented as a Cloud login.

## Remaining release gates

Run the actual installed power's helper from a clean GitHub installation and
verify migration/update/reinstall. Verify native workflow create/update/debug
without injected schemas, Cloud authorization, released self-hosted versions,
user-level configuration across projects, full IDE restart, token expiry,
replacement-registration refresh, and advertised OS support. The older power's
schema issue remains tracked separately. The publisher/contact and default-branch
requirements in the [release checklist](release-checklist.md) still apply.
