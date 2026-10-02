# Setup and maintenance

The helper registers a public OAuth client and configures a native Kiro MCP
connection. Kiro owns browser login, consent, PKCE, token storage, and refresh.
For installation, see the [README](../README.md). Current validation and release
gates live only in the [release checklist](release-checklist.md).

## Commands

Requires Node.js 22+ and Kiro IDE 1.1.70. From a checkout:

```sh
node skills/connect-n8n/scripts/setup.mjs configure --url "<your n8n URL>"
```

The installed connection skill resolves `scripts/setup.mjs` from its own installed
location. Users need no npm installation. If Kiro version detection fails, check
Help > About and pass the actual version with `--kiro-version`; do not bypass the
version check by supplying an older version.

Supply a base URL or full `/mcp-server/http` URL, preserving deployment paths.
Remote URLs require HTTPS. Discovery currently requires a 401 resource-metadata
challenge and one same-origin OAuth server advertising public clients, S256 PKCE,
and refresh. Cross-origin identity providers and redirects are unsupported.

User scope writes `~/.kiro/settings/mcp.json`. To write the selected project's
`.kiro/settings/mcp.json` instead, pass both flags; `--scope workspace` on its
own is rejected:

```sh
node skills/connect-n8n/scripts/setup.mjs configure --url "<your n8n URL>" --scope workspace --workspace "<absolute project path>"
```

`--workspace` on its own does not change the scope. It checks project overrides
while still configuring user scope. Inspect agent-specific overrides in Kiro.
Registration metadata lives in `~/.kiro/n8n-power/connections.json` without tokens.

Keep the same URL, optional `--name`, scope, and workspace on later commands:

```sh
node skills/connect-n8n/scripts/setup.mjs doctor --url "<your n8n URL>" --json
node skills/connect-n8n/scripts/setup.mjs configure --url "<your n8n URL>" --dry-run --json
node skills/connect-n8n/scripts/setup.mjs repair --url "<your n8n URL>" --new-registration
node skills/connect-n8n/scripts/setup.mjs remove --url "<your n8n URL>"
```

Doctor and dry-run perform discovery but do not register clients or write files.
They cannot verify Kiro's tokens. Configure reuses saved registrations and leaves
unchanged configuration bytes alone. Verify access with an actual MCP read.

## Troubleshooting

- **Expired authorization page:** use Retry then Authenticate in Kiro. Complete
  the fresh request within the helper's five-minute connection timeout.
- **401 after a working connection:** let Kiro refresh or re-authenticate, then
  verify a read. Do not immediately create another client.
- **Invalid client:** if its server-side registration was removed, use
  `repair --new-registration` and authenticate again.
- **Callback collision:** a listening port may belong to Kiro. For a confirmed
  conflict, use `repair --callback-port 5694` with an available allowed port,
  then authenticate the replacement client.
- **Uncertain registration:** the request may have reached n8n. Consult the
  administrator before explicitly retrying with `repair --new-registration`.
  An unconsented registration may not appear in Connected clients.
- **Config conflict:** the entry was created elsewhere or edited after setup.
  Preserve it and reconcile the changes, or choose a different name.
- **Missing tool schema:** Kiro's old bundled-power path omitted nested schemas.
  Inspect the native connection's advertised schema; if required fields are
  absent, stop that operation rather than guessing arguments.

Kiro 1.1.70's OAuth cache key omits the configured client ID. The helper adds a
nonsecret `X-N8N-Kiro-Connection` header derived from that ID so replacement
registrations use a separate grant. Keep it until a tested Kiro version no longer
needs it. It requires no n8n changes.

## Configuration safety and removal

JSONC comments and unrelated entries are preserved. Writes use restricted
backups, locks, and atomic replacement; intervening edits cause a conflict.
Backups may contain other entries' secrets. After a crash, verify no helper is
running before removing a stale `.lock` file. Settings larger than 1 MiB are
rejected before replacement.

Repair requires fresh consent and does not revoke the old grant. Removal deletes
only an unchanged managed entry and its registration record; it does not erase
Kiro's token cache or revoke OAuth access. Use **n8n > Settings > Instance-level
MCP > Connected clients** for revocation.

For an old bundled-power connection, establish and verify the new native
connection before disabling the old server through Kiro. Check for duplicates
after updates. Preserve existing user-created OAuth and token connections.

## Development

```sh
npm ci --ignore-scripts
npm run build
npm run check
```

Edit `src/setup/`; regenerate the committed script and third-party notice. The
bundle includes `jsonc-parser` to preserve settings without an installation step
for users. GitHub marks it as generated so reviews can focus on authored source.
Tests use temporary directories and disposable loopback servers, not real n8n
accounts. CI checks bundle reproducibility and Node 22/24 on macOS/Linux/Windows.

### Shared skills

`shared-skills.lock.json` pins the full commit in `n8n-io/skills`. Its `skills/`
tree and license are copied byte-for-byte into
`skills/connect-n8n/references/n8n-skills/`. All 14 skills and their references
are bundled so cross-skill links work. Kiro loads only the three local entry
skills directly; they read the shared router and task-specific files on demand.
Upstream hooks and plugin runtimes are not installed or executed.

Maintainers need Git and network access for these commands:

```sh
npm run skills:sync
npm run skills:check
npm run skills:sync -- --commit "<full upstream commit SHA>"
```

Sync replaces only the imported directory; the optional commit also updates the
lock. Check compares every imported file against Git blobs at the locked commit.
Executable or linked upstream entries stop the import for review instead of
silently changing file modes. A failed lock replacement rolls back the snapshot;
after an interrupted process, rerun sync to restore the atomically locked commit.
It is a separate CI job; `npm run check` validates references and tests locally
without fetching upstream. Keep local changes in the Kiro entry skills; leave the
imported files unchanged. Commit the lock and snapshot together. Revert that pair
to roll back an update. No commands push to or modify `n8n-io/skills`.

After merge to `main`, **Sync shared skills** runs weekly or through Run workflow.
It opens or updates one draft PR on the bot-owned `codex/sync-n8n-skills` branch,
increments the power's patch version, then explicitly dispatches **Validate
power** there. It uses this repository's
`GITHUB_TOKEN`; repository/organization settings must allow GitHub Actions to
create pull requests. No extra token is required, and updates do not auto-merge.
Upstream commits with no changes to the imported files do not create update PRs.
The bot may rebuild its branch, so make Kiro changes in separate branches.

Review upstream changes and test affected Kiro behavior before merging updates.
The shared references mention other agents' Skill tools and hooks; the connection
skill supplies Kiro's file-loading instructions. Snapshot and unit tests verify
packaging, not agent behavior. Clean installed-power build/run/debug acceptance
for this adapter remains a release gate in the existing checklist.
