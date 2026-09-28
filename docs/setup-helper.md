# Setup helper

The helper configures a native Kiro MCP connection using public-client OAuth.
Kiro handles login, consent, PKCE and tokens. This is an implementation candidate,
with release gates tracked in the [implementation plan](public-oauth-implementation-plan.md).

Kiro 1.1.70 caches OAuth credentials by URL and headers, omitting the configured
client ID from the cache key. The helper includes `X-N8N-Kiro-Connection`, a
nonsecret SHA-256 identifier derived from the public client ID, to isolate each
registration's credential cache. It is stable on reruns and changes on client
replacement. n8n needs no code change to accept this header. Do not remove it
while expecting a repaired connection to use a fresh grant.

## Configure

Requires Node.js 22+ and Kiro IDE 1.1.70. The callback adapter is deliberately
limited to the tested Kiro version. On macOS it reads the installed application's
version; otherwise it tries `kiro --version`. If detection fails, check Help >
About and supply the actual version with `--kiro-version`. Do not supply an older
version to bypass the check.

From a source checkout:

```sh
node skills/connect-n8n/scripts/setup.mjs configure --url https://YOUR-N8N-HOST --workspace /absolute/path/to/project
```

From an installed power, ask Kiro to load `connect-n8n` and execute the bundled
`scripts/setup.mjs` relative to that skill's actual installed directory. Quote
the absolute script path and URL. No `npm install` is needed by users.

The default scope writes `~/.kiro/settings/mcp.json`. `--workspace` checks whether
the chosen project overrides that user connection. To keep configuration within
one project, also supply `--scope workspace`. Registration metadata stays in
`~/.kiro/n8n-power/connections.json`; no tokens or passwords are stored there.
Agent-specific overrides and other open workspaces must be checked in Kiro.

Use an instance base URL, including its deployment path, or the complete MCP
endpoint copied from n8n. Remote URLs require HTTPS; HTTP loopback is accepted.
The helper currently requires a 401 resource-metadata challenge and one
same-origin OAuth server advertising public clients, PKCE and refresh tokens.
Custom cross-origin identity providers and redirects are reported as unsupported.

Setup reports the server name and `configured_awaiting_authorization`. Select
that server under **Kiro > MCP Servers > Authenticate**. Review permissions in
the n8n browser page. Kiro 1.1.70 may request every advertised scope: choose
**Custom** and select workflow read/write/execute plus execution read for the
basic workflow tasks. Additional tools need additional permissions.

After authorization, ask Kiro to perform a small read-only workflow search using
the selected server. Configuration and discovery alone do not establish access.

## Diagnose and repair

Use the same URL, name and scope arguments on subsequent commands. `--name` is
optional; by default a stable name is derived from the complete MCP endpoint.

```sh
node skills/connect-n8n/scripts/setup.mjs doctor --url https://YOUR-N8N-HOST --workspace /absolute/path/to/project --json
node skills/connect-n8n/scripts/setup.mjs configure --url https://YOUR-N8N-HOST --dry-run --json
```

Doctor and dry-run make discovery requests but do not register a client or write
files. Doctor cannot inspect Kiro's token state. A listening callback port can
belong to Kiro; do not replace the registration merely because it is listening.

Repeated configure calls reuse the registration and leave unchanged config
bytes alone. If Kiro reports an invalid client after its server-side registration
was removed, explicitly replace it:

```sh
node skills/connect-n8n/scripts/setup.mjs repair --url https://YOUR-N8N-HOST --new-registration
```

For an actual callback conflict, use `repair --callback-port 5694` with an
available port allowed by the instance policy. Both changes require fresh Kiro
authorization. The helper does not revoke the previous grant; manage unused
clients in n8n. It does not remove Kiro's cached tokens. The connection-ID header
isolates the replacement registration; verify fresh consent and a read. Full
replacement/refresh lifecycle testing remains a release gate.

A registration timeout is ambiguous: n8n may have created a client. The helper
journals the attempt and refuses automatic retries. Consult the instance
administrator, then use `repair --new-registration` when appropriate. This can create
an additional registration; respect instance limits. An unconsented registration
may not appear in the user's Connected clients list. No authenticated registration
management API is used by the helper.

JSONC comments and unrelated settings are preserved. Existing entries without
matching helper state, or managed entries edited by the user, cause a conflict
instead of an overwrite. Choose a different name or reconcile those settings.
Settings backups have unique `.bak` filenames and restricted permissions; they
may contain secrets from other MCP entries and must not be committed or shared.
`.lock` files coordinate helper runs. After a crash, verify no helper is running
before removing a stale lock. Atomic writes detect intervening editor changes;
no filesystem mechanism here can coordinate arbitrary external writers perfectly.

## Remove or migrate

```sh
node skills/connect-n8n/scripts/setup.mjs remove --url https://YOUR-N8N-HOST
```

Removal deletes only an unchanged managed entry and its local registration
record. It does not revoke OAuth access or erase Kiro's credential store. Revoke
the grant in **n8n > Settings > Instance-level MCP > Connected clients**.

For an old bundled-power connection, note its endpoint and set up a new native
connection with the helper. Verify a read before disabling/removing the old
server through Kiro. This package no longer contains a bundled `mcp.json`.
Check for duplicate servers after power update or reinstall; preservation and
cleanup through the real update flow still require acceptance testing. Existing
user-created OAuth or token connections can also be used without helper adoption.

## Development

```sh
npm ci --ignore-scripts
npm run build
npm run check
```

Edit `src/setup/`, then regenerate the committed script and third-party notice.
Tests use disposable loopback OAuth servers and temporary directories. They do
not log into an n8n account or operate on workflows. The bundle test copies the
script outside the checkout and runs it without `node_modules`.
