import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { OPTIONS } from '../src/setup/cli.mjs';
import { COMMANDS } from '../src/setup/setup.mjs';
import { SNAPSHOT, localMarkdownLinks, readSnapshot, validateSnapshot } from './sync-skills.mjs';

const plugin = JSON.parse(await readFile('plugin.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(plugin.version, pkg.version);
await assert.rejects(access('mcp.json'), { code: 'ENOENT' });
await access('skills/connect-n8n/scripts/setup.mjs');
await access('skills/connect-n8n/scripts/THIRD-PARTY-NOTICES.txt');
validateSnapshot(await readSnapshot(SNAPSHOT));
for (const skill of ['connect-n8n', 'build-workflow', 'debug-execution']) {
  const text = await readFile(`skills/${skill}/SKILL.md`, 'utf8');
  assert.ok(text.startsWith(`---\nname: ${skill}\n`));
  assert.match(text, /\ndescription: /);
}
async function markdownFiles(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { found.push(...await markdownFiles(file)); continue; }
    if (file.endsWith('.md')) found.push(file);
  }
  return found;
}

async function checkMarkdown(directory) {
  for (const file of await markdownFiles(directory)) {
    const text = await readFile(file, 'utf8');
    for (const target of localMarkdownLinks(text)) {
      await access(path.resolve(path.dirname(file), target));
    }
  }
}
await checkMarkdown('.');

// Every documented setup command must be runnable as written. Three real bugs
// reached review through these examples: an unquoted <placeholder>, which the
// shell reads as a redirection; a flag that does not select what the prose
// promised; and an example left behind when the others changed.
function shellWords(line) {
  // Split on whitespace outside single or double quotes, keeping quote state.
  return [...line.matchAll(/"[^"]*"|'[^']*'|\S+/g)].map(([word]) => word);
}

async function checkDocumentedCommands(directory) {
  const problems = [];
  for (const file of await markdownFiles(directory)) {
    const text = await readFile(file, 'utf8');
    for (const [, block] of text.replace(/\r\n/g, '\n').matchAll(/```sh\n([\s\S]*?)```/g)) {
      for (const line of block.split('\n').map(l => l.trim()).filter(Boolean)) {
        if (!line.includes('setup.mjs')) continue;
        const words = shellWords(line);
        for (const word of words) {
          const quoted = /^["'].*["']$/.test(word);
          if (!quoted && /[<>]/.test(word)) {
            problems.push(`${file}: unquoted ${word} is a shell redirection, quote the placeholder\n    ${line}`);
          }
          if (word.startsWith('--')) {
            const flag = word.slice(2).split('=')[0];
            if (!Object.hasOwn(OPTIONS, flag)) problems.push(`${file}: --${flag} is not a CLI option\n    ${line}`);
          }
        }
        // Find the positional the CLI would see, skipping flags and the values
        // they consume. A command name used as an option value is not a command.
        let command;
        for (let index = words.indexOf(words.find(word => word.includes('setup.mjs'))) + 1; index < words.length; index++) {
          const word = words[index];
          if (word.startsWith('--')) {
            const [flag, inlineValue] = word.slice(2).split('=');
            if (OPTIONS[flag]?.type === 'string' && inlineValue === undefined) index++;
            continue;
          }
          command = word;
          break;
        }
        if (!words.includes('--help') && !COMMANDS.includes(command)) {
          problems.push(`${file}: first positional is ${command ?? 'absent'}, not one of ${COMMANDS.join(', ')}\n    ${line}`);
        }
      }
    }
  }
  if (problems.length) throw new Error(`Documented commands are not runnable:\n  ${problems.join('\n  ')}`);
}

await checkDocumentedCommands('.');
console.log('Manifest version, skills, bundle contents, local Markdown links and documented commands checked.');
