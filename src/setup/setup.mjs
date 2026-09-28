import { homedir } from 'node:os';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { callbackUri, connectionConfig, detectKiroVersion, requireSupportedKiro, availablePort } from './kiro.mjs';
import { defaultName, discover, normalizeEndpoint, register } from './discovery.mjs';
import { fail } from './errors.mjs';
import { atomicWrite, editConfig, fingerprint, parseConfig, parseState, readSnapshot, withLock } from './storage.mjs';

const consentNote = 'Kiro 1.1.70 may request all permissions. In n8n consent, select Custom and review workflow read/write/execute and execution read. The helper does not grant access.';

async function locations(options, home) {
  const root = await realpath(home);
  const workspace = options.workspace ? await realpath(path.resolve(options.workspace)) : null;
  const scope = options.scope ?? 'user';
  if (!['user', 'workspace'].includes(scope)) fail('ARGUMENT', '--scope must be user or workspace.');
  if (scope === 'workspace' && !workspace) fail('ARGUMENT', 'Workspace scope requires an explicit --workspace directory.');
  return {
    statePath: path.join(root, '.kiro/n8n-power/connections.json'),
    configPath: path.join(scope === 'user' ? root : workspace, '.kiro/settings/mcp.json'),
    overridePath: scope === 'user' && workspace ? path.join(workspace, '.kiro/settings/mcp.json') : null,
    scope,
  };
}

function checkOwnership(entry, record) {
  if (entry !== undefined && (!record?.fingerprint || ![record.fingerprint, record.previousFingerprint].includes(fingerprint(entry)))) {
    fail('CONFIG_CONFLICT', 'This server entry is unmanaged or has been edited. Preserve it and choose another --name, or reconcile it manually before repair/removal.');
  }
}

export async function runSetup(options, dependencies = {}) {
  const command = options.command ?? 'configure';
  if (!['configure', 'doctor', 'repair', 'remove'].includes(command)) fail('ARGUMENT', 'Choose configure, doctor, repair or remove.');
  if (!options.url) fail('ARGUMENT', '--url is required to identify the intended instance.');
  if (options.newRegistration && command !== 'repair') fail('ARGUMENT', '--new-registration is only available with repair.');
  if (command === 'repair' && !options.newRegistration && options.callbackPort === undefined) fail('ARGUMENT', 'Repair requires --new-registration or a new --callback-port. Use doctor first.');
  if (options.callbackPort !== undefined && (!Number.isInteger(options.callbackPort) || options.callbackPort < 1024 || options.callbackPort > 65535)) fail('CALLBACK_PORT', '--callback-port must be between 1024 and 65535.');

  const endpoint = normalizeEndpoint(options.url);
  const serverName = options.name ?? defaultName(endpoint);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(serverName) || ['__proto__', 'constructor', 'prototype'].includes(serverName)) fail('ARGUMENT', 'Use a server name of 1–80 letters, numbers, hyphens or underscores, starting with a letter or number.');
  const paths = await locations(options, dependencies.homeDir ?? homedir());
  const key = fingerprint([paths.configPath, serverName]);
  const inspect = dependencies.discover ?? discover;
  const createRegistration = dependencies.register ?? register;
  const choosePort = dependencies.availablePort ?? availablePort;
  const write = dependencies.atomicWrite ?? atomicWrite;
  const network = dependencies.network ?? {};
  const baseResult = { serverName, endpoint, scope: paths.scope, configPath: paths.configPath };

  const action = async () => {
    let stateText = await readSnapshot(paths.statePath);
    const state = parseState(stateText);
    const record = state.connections[key];
    const configText = await readSnapshot(paths.configPath);
    const config = parseConfig(configText);
    const entry = config.mcpServers?.[serverName];
    if (record && (record.endpoint !== endpoint || record.configPath !== paths.configPath || record.serverName !== serverName)) fail('STATE_CONFLICT', 'The saved connection identifies a different endpoint or settings file. Use a different name.');
    checkOwnership(entry, record);
    if (paths.overridePath && command !== 'remove') {
      const override = parseConfig(await readSnapshot(paths.overridePath));
      if (Object.hasOwn(override.mcpServers ?? {}, serverName)) fail('WORKSPACE_OVERRIDE', 'This workspace overrides the user-level server. Select workspace scope or a different name before configuring.');
    }
    const saveState = async () => {
      const next = JSON.stringify(state, null, 2) + '\n';
      await write(paths.statePath, stateText, next);
      stateText = next;
    };
    if (command === 'remove') {
      if (!record) return { ...baseResult, status: 'not_managed', changed: false };
      if (options.dryRun) return { ...baseResult, status: 'dry_run', action: 'remove', changed: false };
      if (entry !== undefined) await write(paths.configPath, configText, editConfig(configText, serverName, undefined));
      delete state.connections[key];
      await saveState();
      return { ...baseResult, status: 'removed', changed: true, next: 'Revoke the grant in n8n Settings > Instance-level MCP > Connected clients. Removing local settings does not revoke tokens.' };
    }

    const discovery = await inspect(endpoint, network);
    if (record && (record.issuer !== discovery.issuer || record.registrationEndpoint !== discovery.registrationEndpoint)) fail('ISSUER_CHANGED', 'The saved issuer or registration endpoint changed. Inspect the deployment before replacing this connection.');
    if (command === 'doctor') {
      let callback = 'not_configured';
      if (record) {
        try { await choosePort(record.callbackPort); callback = 'available'; } catch { callback = 'listening_or_unavailable'; }
      }
      return { ...baseResult, status: record?.status === 'ready' && entry ? 'configured_unverified' : 'setup_required',
        registrationStatus: record?.status ?? 'absent', callback,
        next: 'A listening port may belong to Kiro. Only a successful read through Kiro proves authorization and connection.', warnings: [consentNote] };
    }

    const version = options.kiroVersion ?? await (dependencies.detectKiroVersion ?? detectKiroVersion)();
    requireSupportedKiro(version);
    if (record && record.status !== 'ready' && !options.newRegistration) fail('REGISTRATION_UNCERTAIN', 'A previous registration did not finish. Consult the instance administrator, then explicitly retry with repair --new-registration if needed.');
    if (record && options.callbackPort !== undefined && options.callbackPort !== record.callbackPort && command !== 'repair') fail('CALLBACK_CHANGE', 'Changing an existing callback requires repair --callback-port and fresh authorization.');
    const newRegistration = !record || options.newRegistration || (options.callbackPort !== undefined && options.callbackPort !== record.callbackPort);
    const port = newRegistration ? await choosePort(options.callbackPort ?? record?.callbackPort ?? 0) : record.callbackPort;
    if (options.dryRun) return { ...baseResult, status: 'dry_run', action: newRegistration ? 'register_and_configure' : 'reuse_registration', callbackUri: callbackUri(port), changed: false, warnings: [consentNote] };

    let active = record;
    if (newRegistration) {
      active = { endpoint, ...discovery, serverName, configPath: paths.configPath, scope: paths.scope,
        kiroVersion: version, callbackPort: port, status: 'registering',
        ...(record?.fingerprint ? { fingerprint: record.fingerprint } : {}) };
      state.connections[key] = active;
      // Journal before POST: a crash/timeout must not cause an automatic duplicate registration.
      await saveState();
      try {
        active.clientId = await createRegistration(discovery, callbackUri(port), network);
        active.status = 'ready';
      } catch (error) {
        active.status = 'uncertain';
        await saveState();
        throw error;
      }
      // Persist the client ID before editing Kiro, so a config-write failure is resumable.
      await saveState();
    }
    const desired = connectionConfig(endpoint, active.clientId, port);
    const changed = entry === undefined || fingerprint(entry) !== fingerprint(desired);
    const nextConfig = changed ? editConfig(configText, serverName, desired) : configText;
    const previousFingerprint = active.fingerprint;
    active.fingerprint = fingerprint(desired);
    // Store both accepted fingerprints across the write, allowing a crash to resume.
    if (previousFingerprint && previousFingerprint !== active.fingerprint) active.previousFingerprint = previousFingerprint;
    await saveState();
    await write(paths.configPath, configText, nextConfig);
    delete active.previousFingerprint;
    await saveState();
    return { ...baseResult, status: 'configured_awaiting_authorization', changed,
      registration: newRegistration ? 'created' : 'reused', callbackUri: callbackUri(port),
      next: `In Kiro MCP Servers, authenticate ${serverName}, review consent, then ask Kiro for a read-only workflow search.`,
      warnings: [consentNote, ...(!options.workspace && paths.scope === 'user' ? ['Workspace and agent overrides were not inspected. Run doctor with --workspace for the project you use.'] : ['Agent-specific overrides must be checked in Kiro.'])] };
  };
  if (options.dryRun || command === 'doctor') return await action();
  return await withLock(paths.statePath, () => withLock(paths.configPath, action));
}
