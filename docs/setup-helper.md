# Setup and maintenance

The helper registers a public OAuth client and configures a native Kiro MCP
connection. Kiro owns browser login, consent, PKCE, token storage, and refresh.
For installation, see the [README](../README.md). Current validation and release
gates live only in the [release checklist](release-checklist.md).

## Commands

Read this section and Authorization before setting up a connection. Obtain the
instance URL from the user or verified existing configuration; never guess it.
Accept its base URL, preserving deployment paths, or the Server URL under
**n8n > Settings > Instance-level MCP > Connection details > Connect**. An
owner/admin must enable MCP; the helper does not change that setting.

Every URL below is a placeholder. Substitute the user's URL before running a
command; if none is known, ask for it. Remote URLs require HTTPS; HTTP is allowed
only on loopback. Discovery requires a 401 resource-metadata challenge and one
same-origin OAuth server advertising public clients, S256 PKCE and refresh.
Cross-origin identity providers and redirects are unsupported.

Check `node --version`: Node.js 22+ must be available in Kiro's environment.
Explain a missing runtime; do not install one automatically. Setup currently
accepts Kiro IDE 1.1.70, 1.2.4 and 1.2.37. If detection fails, check Help > About and pass the
actual version with `--kiro-version`; never supply an older version to bypass it.

For an installed power, resolve `scripts/setup.mjs` relative to the installed
connect-n8n skill. Quote its absolute path and user inputs for the shell. Do not
assume `${PLUGIN_ROOT}` is set or that the workspace contains the power source.
No npm install is needed:

```sh
node "<absolute installed path>/connect-n8n/scripts/setup.mjs" configure --url "<the user's n8n URL>" --json
```

The remaining examples use checkout-relative paths; substitute the installed
helper's absolute path when working from an installed power. From a checkout:

```sh
node skills/connect-n8n/scripts/setup.mjs configure --url "<your n8n URL>"
```

Default user scope writes `~/.kiro/settings/mcp.json`, shared across projects;
explain that scope to the user. For only the selected project's
`.kiro/settings/mcp.json`, pass both flags; `--scope workspace` alone is rejected:

```sh
node skills/connect-n8n/scripts/setup.mjs configure --url "<your n8n URL>" --scope workspace --workspace "<absolute project path>"
```

`--workspace` on its own does not change the scope. It checks project overrides
while still configuring user scope. Inspect agent-specific overrides in Kiro.
Registration metadata lives in `~/.kiro/n8n-power/connections.json` without tokens.
Use `--name` for a requested friendly server name. Keep commands short; omit
`--workspace` unless selecting workspace scope or checking project overrides.

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

## Authorization

On `configured_awaiting_authorization`, identify the configured server and direct
the user to **Kiro > MCP Servers > Authenticate**. Kiro owns sign-in, consent,
PKCE and tokens. Never request passwords, copy authorization codes, or implement
login/consent through REST.

Kiro may request all advertised scopes despite configured scopes. On the
n8n consent page, choose **Custom** and review workflow read/write/execute plus
execution read for build/run/debug. Respect a read-only selection and request
more access only when the task needs it. The helper does not constrain the
browser request. After consent, repeat the connection skill's read-only preflight.

## Troubleshooting

- **Corrupted terminal command or no output:** long single-line commands have
  rendered incorrectly in Kiro. Do not retry variations or write a wrapper
  script. Give the user the exact command to run in their terminal and ask for
  its JSON result. Running the helper by hand uses the same setup path.
- **No tools:** inspect the endpoint, connection error and authorization state.
  Check reachability from Kiro; localhost in a remote session names that remote
  machine. The helper targets local IDE sessions.
- **Network, HTML or 404 response:** check the URL, deployment path, reverse proxy
  and instance MCP setting. Do not infer the cause from status alone or try
  another host.
- **Expired authorization page:** close it, use Retry then Authenticate in Kiro.
  Complete a fresh request within the helper's five-minute connection timeout;
  never reuse the stale authorization URL.
- **401 after a working connection:** let Kiro refresh or re-authenticate, then
  verify a read. Do not immediately create another client.
- **Invalid client:** if its server-side registration was removed, use
  `repair --new-registration` and authenticate again. Review unused grants in
  n8n; the helper does not revoke them.
- **Callback collision:** a listening port may belong to Kiro. For a confirmed
  conflict, use `repair --callback-port 5694` with an available allowed port,
  then authenticate the replacement client. Do not weaken instance callback policy.
- **Uncertain registration:** the request may have reached n8n. Consult the
  administrator before explicitly retrying with `repair --new-registration`.
  An unconsented registration may not appear in Connected clients.
- **Config conflict:** the entry was created elsewhere or edited after setup.
  Preserve it and reconcile the changes, or choose a different name.
- **Browser success followed by missing `client_id`:** inspect whether Kiro is
  using the old bundled server. Public-client setup supplies an ID without a
  secret. Do not assume consent failed or repeatedly restart authorization.
- **Missing tools or workflows:** check n8n version, features/license, builder
  settings, OAuth grant, user/project access and workflow exposure. The 2.34.0
  tool-name floor does not establish OAuth compatibility for every version.
  Reauthorization cannot enable features or grant a project role. Search previews
  can include workflows not Available in MCP; follow returned access errors
  before inspecting or running them. Missing tools do not prove an empty instance.
- **Missing tool schema:** Kiro's old bundled-power path omitted nested schemas.
  Inspect the native connection's advertised schema; if required fields are
  absent, stop that operation rather than guessing arguments. For repeated
  missing `pinData` on `test_workflow`, follow the connection skill's guarded
  manual-execution fallback. Current acceptance and limits are recorded in the
  release checklist.

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
This power ships no root `mcp.json`; **Open powers config** is not the native
connection setup path.

If the user explicitly chooses MCP access-token authentication, use the
[README fallback](../README.md#token-fallback). Keep tokens out of chat and source
files. Do not silently switch authentication methods or use REST for workflow
operations.

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

`shared-skills.lock.json` pins the full commit in `n8n-io/skills`. Sync reads its
Git blobs, applies [local corrections](../patches/shared-skills.patch), and writes to
`skills/connect-n8n/references/n8n-skills/`. All 14 skills and their references
are bundled so cross-skill links work. Kiro loads only the three local entry
skills directly; they read the shared router and task-specific files on demand.
Upstream hooks and plugin runtimes are not installed or executed.
The connection skill defines when to load or reuse guidance already in context;
setup and recovery sections here are read only when needed. Reusing instructions
does not replace current execution evidence or per-operation safety checks.

Maintainers need Git and network access for these commands:

```sh
npm run skills:sync
npm run skills:check
npm run skills:sync -- --commit "<full upstream commit SHA>"
```

Sync replaces only the imported directory; the optional commit also updates the
lock. Check compares every imported file against the locked Git blobs plus the
same patch; all unpatched files and the license remain byte-for-byte upstream.
Executable or linked upstream entries stop the import for review instead of
silently changing file modes. A failed lock replacement rolls back the snapshot;
after an interrupted process, rerun sync to restore the atomically locked commit.
It is a separate CI job; `npm run check` validates references and tests locally
without fetching upstream. Keep Kiro behavior in the entry skills. For shared
content fixes, edit `patches/shared-skills.patch` and regenerate the snapshot;
do not leave untracked edits in the generated files. A conflicting or already
applied patch stops sync before it changes the snapshot or lock. When upstream
fixes an issue, remove the corresponding patch hunks and review the result.
Commit the patch, lock and generated files together; revert them together to roll
back. No commands push to or modify `n8n-io/skills`.

After merge to `main`, **Sync shared skills** runs weekly or through Run workflow.
It opens or updates one draft PR on the bot-owned `codex/sync-n8n-skills` branch,
increments the power's patch version, then explicitly dispatches **Validate
power** there. It uses this repository's
`GITHUB_TOKEN`; repository/organization settings must allow GitHub Actions to
create pull requests. No extra token is required, and updates do not auto-merge.
Upstream commits with no changes to the imported files do not create update PRs.
If upstream reverts a pending update so its files match `main`, the obsolete bot
PR is closed on the next run.
The bot may rebuild its branch, so make Kiro changes in separate branches.

Review upstream changes and test affected Kiro behavior before merging updates.
The shared references mention other agents' Skill tools and hooks; the connection
skill supplies Kiro's file-loading instructions. Snapshot and unit tests verify
packaging, not agent behavior. Clean installed-power build/run/debug acceptance
for this adapter remains a release gate in the existing checklist.
