---
name: build-workflow
description: "Build an n8n workflow using the code open in the workspace, then validate and test it before calling it done. Use when the user asks to create, build, or change an n8n workflow, to automate a task, to add a scheduled job or a webhook, or to connect n8n to the application in this repository. Triggers: build an n8n workflow, automate this, add a webhook, schedule this, wire n8n to my API, create a workflow."
metadata:
  author: n8n
  version: "1.0.0"
---

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

- Validate before you save. A validation error is cheaper than a failed run.
- Test after you save, and **read the result**. A saved workflow is not a working
  workflow.
- Report what the test actually returned. If it failed, say so and fix it. Do not
  describe an untested workflow as done.

Pin data lets a workflow run when its trigger cannot fire. Generate it with the
pin-data tool the server lists, then pass it to the test.

### A test run is not a dry run

Testing pins triggers, credentialed nodes, and HTTP Request nodes, so those are
simulated. **Everything else executes for real**, including credential-free nodes
that touch the outside world: Execute Command, file reads and writes, and Code
nodes that do their own I/O.

So before the first test run, look at what the workflow will actually do.

- If every unpinned node is pure data shaping (Set, If, Merge, plain Code), test
  without asking.
- If any unpinned node writes a file, runs a command, sends a message, or changes
  state anywhere, **say what will happen and get confirmation first.** Name the
  node and the effect. "This will run `Execute Command` against your machine, and
  the Slack node will post to #general. Test it?"
- If the user declines, validate and stop there. Tell them the workflow is
  unverified and why, rather than quietly calling it done.

Pinning the side-effecting node is often the better answer. Offer it.

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
