import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const skills = new URL('../../skills/connect-n8n/references/n8n-skills/skills/', import.meta.url);
const valid = { name: 'Alice', email: 'alice@example.com', plan: 'pro', seat_count: 5, tags: ['eu'] };

for (const file of ['validation-subworkflow.ts', 'validation-subworkflow-usage.ts']) {
  test(`${file}: malformed payloads follow the structured validation path`, async () => {
    const source = await readFile(new URL(`n8n-error-handling-official/references/examples/${file}`, skills), 'utf8');
    const literal = source.match(/const validatorExpr = expr\((`[\s\S]*?`)\)/)?.[1];
    assert.ok(literal, 'Run the actual expression embedded in the bundled example.');
    const expression = vm.runInNewContext(literal).slice(2, -2);
    const validate = body => vm.runInNewContext(expression, { $json: { body } });
    assert.equal(validate(valid).valid, true);
    assert.equal(validate({ name: 'Alice', email: 'alice@example.com', plan: 'starter', seat_count: 1 }).valid, true);
    for (const body of ['hello', 42, true, false, 0, '', null, undefined, [], [valid]]) {
      const result = validate(body);
      assert.equal(result.valid, false, JSON.stringify(body));
      assert.equal(result.details.$body, 'Expected a JSON object');
    }
    for (const tags of [[null], [123], [''], ['eu', false]]) {
      const result = validate({ ...valid, tags });
      assert.equal(result.valid, false);
      assert.match(Object.keys(result.details).join(','), /tags\[\d\]/);
    }
    for (const key of ['extra', '__proto__', 'constructor']) {
      const result = validate({ ...valid, [key]: 'unexpected' });
      assert.equal(result.valid, false);
      assert.equal(result.details[key], 'Unknown field');
      assert.equal(result.requiredSchema.additionalProperties, false);
      assert.ok(result.validationError.includes(key));
    }
    for (const change of [{ tags: [] }, { tags: 'eu' }, { name: '' }, { email: 'invalid' }, { plan: 'premium' }, { seat_count: 0 }, { seat_count: 501 }, { seat_count: 1.5 }]) {
      assert.equal(validate({ ...valid, ...change }).valid, false, JSON.stringify(change));
    }
  });
}

test('per-item Code example returns one object for each current item', async () => {
  const source = await readFile(new URL('n8n-code-nodes-official/references/JAVASCRIPT_PATTERNS.md', skills), 'utf8');
  const code = source.match(/### Run Once for Each Item[\s\S]*?```ts\n([\s\S]*?)```/)?.[1];
  assert.ok(code);
  for (const [qty, price] of [[2, 3], [4, 5]]) {
    const result = new Function('$input', code)({ item: { json: { qty, price } } });
    assert.deepEqual(result, { json: { qty, price, total: qty * price } });
  }
});
