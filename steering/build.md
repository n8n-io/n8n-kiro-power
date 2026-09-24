# Building n8n workflows from Kiro

The n8n MCP server sends its own build instructions when it connects. Those cover
the tool sequence: read the SDK reference, get best practices, discover nodes, get
node types, validate, then save. **Follow them. Do not re-derive them and do not
work around them.**

This file covers what the server cannot know: you are in an editor, with the
user's code open.

## Use the workspace

A chat client building an n8n workflow only has what the user typed. You have the
repository. Read it before you ask.

- **Find the real endpoint.** If the user wants a workflow that calls their API,
  read the route definitions rather than asking for the URL. Match the actual path,
  method, and payload shape.
- **Match the payload to the code.** When a workflow posts to the user's service,
  build the body from the type or schema in the repo, not from a guess.
- **Read the environment files.** `.env.example`, `docker-compose.yml`, and the
  config module tell you the hostnames and ports the workflow has to reach. Never
  read secrets out of `.env` and never put a secret into a workflow. Use an n8n
  credential.
- **Check what already exists.** Search the repo for existing webhook handlers or
  cron jobs before you build a workflow that duplicates one.

## Wiring n8n to code under development

When the workflow and the application talk to each other, say which side owns
what, and build both halves.

**n8n calls the application.** The workflow needs a reachable URL. `localhost` in
a cloud n8n instance means the n8n container, not the user's machine. Say this
explicitly rather than building something that silently cannot work. Offer a
tunnel, a deployed environment, or a self-hosted n8n on the same network.

**The application calls n8n.** The workflow needs a Webhook trigger. Build the
workflow first, read the production webhook URL off it, then write the calling
code in the repo with that URL. Do not invent the URL.

**Both.** Build the n8n side first and test it, then write the application side
against a working endpoint.

## Test before you claim it works

The build loop has a verification step and it is not optional.

- `validate_workflow` before you save. A validation error is cheaper than a failed
  run.
- `test_workflow` after you save, and **read the result**. A saved workflow is not
  a working workflow.
- Report what the test actually returned. If it failed, say so and fix it. Do not
  describe an untested workflow as done.

Use `prepare_workflow_pin_data` when a trigger cannot fire in a test, so the run
has realistic input.

## Publishing

Creating a workflow does not activate it. `publish_workflow` does.

Ask before you publish. A published workflow with a schedule or a webhook starts
doing real work, possibly against production systems. Building is reversible;
publishing to a live instance is less so.

## Credentials

- Call `list_credentials` and reuse what the user has. Do not create a duplicate.
- Never write a key, token, or password into workflow parameters. Credentials are
  a separate object for a reason.
- If no credential fits, say which one the user has to create and where. You
  cannot create one for them.

## When a tool is missing

A tool that is absent was not granted on the consent screen. Name the tool you
need and what you wanted it for, and say that reconnecting lets them grant it.
Do not name a scope you are guessing at, do not route around the gap with a
different tool, and do not ask them to grant everything.
