import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const plugin = JSON.parse(await readFile('plugin.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(plugin.version, pkg.version);
await assert.rejects(access('mcp.json'), { code: 'ENOENT' });
await access('skills/connect-n8n/scripts/setup.mjs');
await access('skills/connect-n8n/scripts/THIRD-PARTY-NOTICES.txt');
for (const skill of ['connect-n8n', 'build-workflow', 'debug-execution']) {
  const text = await readFile(`skills/${skill}/SKILL.md`, 'utf8');
  assert.ok(text.startsWith(`---\nname: ${skill}\n`));
  assert.match(text, /\ndescription: /);
}
async function checkMarkdown(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await checkMarkdown(file); continue; }
    if (!file.endsWith('.md')) continue;
    const text = await readFile(file, 'utf8');
    for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
      await access(path.resolve(path.dirname(file), target.split('#')[0]));
    }
  }
}
await checkMarkdown('.');
console.log('Manifest version, skills, bundle contents and local Markdown links checked.');
