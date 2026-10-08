import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { runSetup } from './setup.mjs';
import { SetupError } from './errors.mjs';
import { SUPPORTED_KIRO_VERSIONS } from './kiro.mjs';

export { runSetup };

// The flag surface. check-package.mjs validates every documented command
// against this and against COMMANDS in setup.mjs, so an example cannot name a
// flag or a command that does not exist.
export const OPTIONS = {
  url: { type: 'string' }, name: { type: 'string' }, scope: { type: 'string' }, workspace: { type: 'string' },
  'callback-port': { type: 'string' }, 'kiro-version': { type: 'string' },
  'dry-run': { type: 'boolean' }, 'new-registration': { type: 'boolean' }, json: { type: 'boolean' }, help: { type: 'boolean' },
};

export async function main(args = process.argv.slice(2)) {
  let json = args.includes('--json');
  try {
    if (Number(process.versions.node.split('.')[0]) < 22) throw new SetupError('NODE_VERSION', 'Install Node.js 22 or newer, then rerun setup. No settings were changed.');
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: OPTIONS });
    json = Boolean(values.json);
    if (values.help) {
      console.log(`Usage: node setup.mjs <configure|doctor|repair|remove> --url <n8n URL>\n\nOptions: --name <name> --scope <user|workspace> --workspace <directory>\n         --callback-port <1024-65535> --kiro-version <installed version>\n         --dry-run --json\nRepair:  --new-registration (explicit retry/replacement) or --callback-port\n\nRequires Node.js 22+ and Kiro IDE ${SUPPORTED_KIRO_VERSIONS.join(' or ')}. User scope is the default.\nThe helper configures a public client; sign in and approve access in Kiro.`);
      return;
    }
    if (positionals.length > 1) throw new SetupError('ARGUMENT', 'Supply one command. Use --help for usage.');
    const result = await runSetup({ command: positionals[0], url: values.url, name: values.name,
      scope: values.scope, workspace: values.workspace, callbackPort: values['callback-port'] === undefined ? undefined : Number(values['callback-port']),
      kiroVersion: values['kiro-version'], dryRun: values['dry-run'], newRegistration: values['new-registration'] });
    console.log(json ? JSON.stringify(result) : [
      `${result.serverName}: ${result.status}`, `Instance: ${result.endpoint}`, `Settings: ${result.configPath}`,
      result.next, ...(result.warnings ?? []),
    ].filter(Boolean).join('\n'));
  } catch (error) {
    const known = error instanceof SetupError;
    const code = known ? error.code : error.code === 'CALLBACK_PORT' ? 'CALLBACK_PORT' : 'SETUP_FAILED';
    const message = known || code === 'CALLBACK_PORT' ? error.message : 'Setup failed. Check command options, filesystem permissions and file locks. No credentials or server responses are included in this diagnostic.';
    const output = { status: 'error', code, message };
    (json ? console.log : console.error)(json ? JSON.stringify(output) : `${code}: ${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
