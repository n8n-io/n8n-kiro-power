# JavaScript Code node patterns

Once `DECISION_TREE.md` confirms Code is necessary, this covers patterns and gotchas.

## Run modes

Two execution modes. **Default to Run Once for All Items.** It's the standard shape and almost always what you want, even when the work is per-item: just `for (const item of $input.all())` or `.map()` inside.

### Run Once for All Items (default, use this)

Runs once with all items as `$input.all()`. Per-item logic just goes inside the loop.

```ts
const items = $input.all()
const totals = items.map(item => ({
    ...item.json,
    total: item.json.qty * item.json.price,
}))
return totals.map(json => ({ json }))
```

### Run Once for Each Item

Runs once per input item. `$input.item` (or `$json`) is the current item; `$input.first()` is unavailable in this mode. Return a single item object.

```ts
const item = $input.item.json
return { json: { ...item, total: item.qty * item.price } }
```


### Picking the mode

| Need | Mode |
|---|---|
| Anything aggregate / reduce across items | Run for All |
| Combine items conditionally | Run for All |
| Per-item transform | Run for All with a loop inside (Edit Fields is usually even better) |
| Per-item with explicit error isolation per item | Run for Each, paired with `continueOnFail` |
| Fan-out: turn 1 input item into N output items | Run for All, return the expanded array |

## Return shape

In **Run Once for All Items**, return an array of `{ json: ... }` objects. In **Run Once for Each Item**, return one `{ json: ... }` object as above. The examples below use all-items mode:

```ts
// Single output item
return [{ json: { foo: 'bar' } }]

// Multiple output items
return [
    { json: { id: 1 } },
    { json: { id: 2 } },
]

// Item with binary
return [{
    json: { name: 'report.pdf' },
    binary: { data: { /* binary data */ } }
}]

// Empty output (skip downstream)
return []
```

In all-items mode, returning a raw object instead of the array-of-`{json}` shape is a mistake.

```ts
// ❌ DON'T
return { foo: 'bar' }

// ✅ DO
return [{ json: { foo: 'bar' } }]
```

## Available libraries

Curated list of pre-imported / requireable libraries. The set evolves. Reliably present:

- `crypto`: Node's crypto module.
- `lodash` (sometimes as `_`): `groupBy`, `chunk`, `keyBy` are still handy.
- `moment`: deprecated. Prefer Luxon, available globally.

No HTTP client (`axios`, `node-fetch`, etc.) is bundled. Use the HTTP Request node for any outbound HTTP, that's a hard line.

Hard list. You cannot install new packages.

## Handling binary data

Binary lives in `item.binary[<key>]`, separately from `item.json`. Common patterns:

```ts
// Pass binary through unchanged
const items = $input.all()
return items.map(item => ({
    json: { ...item.json, processed: true },
    binary: item.binary,
}))
```

For binary hashing, use the native Crypto node with `binaryPropertyName` set to the input binary key (for example, `data`). Read binary buffers in Code only when the required operation is unsupported by native nodes.

See `n8n-binary-and-data-official` for binary patterns. Code nodes are one of several ways to handle binary, often not the best.

## Standard hashing and HMAC

Use the native Crypto node for standard hashes and HMAC signatures. Only a non-standard signing scheme unsupported by Crypto can justify Code; first inspect the node's available operations with `get_node_types`. Keep secrets in credentials, not input items (see `n8n-credentials-and-security-official`'s `CUSTOM_CREDENTIALS.md`).

## Common patterns that justify Code

### Aggregation that built-in nodes don't cover

```ts
// Compute median across input items
const values = $input.all().map(item => item.json.value).sort((valueA, valueB) => valueA - valueB)
const mid = Math.floor(values.length / 2)
const median = values.length % 2
    ? values[mid]
    : (values[mid - 1] + values[mid]) / 2

return [{ json: { median, count: values.length } }]
```

(But: check `search_nodes` for a built-in aggregation node first. If one exists, use it.)

## Things to avoid

### `console.log` for "debugging"

Goes to instance logs the user may not have access to. Use `test_workflow` and `get_workflow_execution`.

To surface debug info downstream:

```ts
return [{ json: { ...result, _debug: { stepCount: 3, intermediate } } }]
```

Strip `_debug` in a downstream Edit Fields before publishing.

### Long-running synchronous loops

A `for` loop doing HTTP calls or thousands of synchronous items blocks execution and may time out.

Better:

- HTTP calls: HTTP Request node + `SplitInBatches`.
- Many items: smaller batches + Aggregate to combine.

### Error swallowing

```ts
// DON'T
try {
    return [{ json: doRiskyThing() }]
} catch (error) {
    return [{ json: { error: error.message } }]
}
```

Returning error as data hides it: workflow continues as if all is well, downstream gets error-shaped data.

Better: let Code throw, set `onError: 'continueErrorOutput'` and wire `output(1)`. See `n8n-error-handling-official`.

### Re-implementing built-in functionality

If you're writing JS for HTTP calls, email sending, file uploads, or date math, use the corresponding native node or Luxon in expressions.

## Performance

Code runs in a sandboxed JS runtime, separate from n8n's main process. Each invocation pays sandbox setup, value marshaling, and isolation overhead. The same logic in an Edit Fields arrow function (which runs in-process via the expression engine) can be hundreds of times faster, anecdotally ~2ms vs ~600ms for the same code.

For most workflows the overhead is a rounding error next to one HTTP call. When it matters (hot paths, large item counts, latency-sensitive webhooks), see the performance section in `ARROW_FUNCTIONS_IN_EDIT_FIELDS.md`. Cramming code-node-grade logic into an inline arrow function is ugly but can be the right call.

99% of the time the bottleneck is upstream (HTTP call, DB query). If genuinely slow, profile via `get_workflow_execution` first.

## Testing

Always run `test_workflow` after writing a Code node. Most error-prone single-node category in n8n: type errors, return-shape mistakes, library assumptions. Test before publish.
