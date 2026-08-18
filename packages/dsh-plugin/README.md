# dsh-plugin-reactive-resume

Connect [Reactive Resume](https://rxresu.me) to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Read, create, and edit your resumes and job applications from a Harness session.

## Install

```bash
pnpm add dsh-plugin-reactive-resume
```

## Configure

Mint an API key at `https://rxresu.me/dashboard/settings/api-keys`, then add a row to your `cordis.yml`:

```yaml
- insert:
    - id: reactive-resume
      name: dsh-plugin-reactive-resume
      config:
        apiKey: !!js process.env.RXRESUME_API_KEY
```

### Options

| Key | Default | Description |
|---|---|---|
| `apiKey` | *(required)* | API key from `<url>/dashboard/settings/api-keys`. |
| `url` | `https://rxresu.me` | Origin of your instance. Set this if you self-host. |
| `serverName` | `resume` | Tool namespace. Tools reach the model as `mcp__<serverName>__<rawName>`. |
| `toolCallTimeoutMs` | `60000` | Per-tool-call timeout. |

Every tool Reactive Resume publishes is exposed. Narrowing that set is not currently possible from a plugin: Harness's `ctx.tools.restrict()` requires an agent-scoped context, which a plugin context is not.

### Self-hosted

```yaml
config:
  apiKey: !!js process.env.RXRESUME_API_KEY
  url: http://localhost:3000
```

## What it does

Bridges Reactive Resume's MCP server into `ctx.tools`, and contributes a system-prompt section covering the things models get wrong about resume editing: reading before patching, RFC 6902 path construction against the published schema, UUID-keyed section entries, and locked resumes.

You could wire the bridge yourself with a raw `@deepseek-ai/dsh-mcp-client` row. What you cannot do that way is contribute the prompt section — that is what this package adds.

## Development

This package lives in the [Reactive Resume monorepo](https://github.com/amruthpillai/reactive-resume) at `packages/dsh-plugin`, next to `packages/mcp` — the server it bridges. `src/tool-names.test.ts` checks every tool the prompt guide names against `@reactive-resume/mcp/tool-names`, so renaming a tool breaks this package in the same pull request.

```bash
pnpm --filter dsh-plugin-reactive-resume test
pnpm --filter dsh-plugin-reactive-resume build
```

## License

MIT
