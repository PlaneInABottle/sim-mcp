# sim-mcp

`sim-mcp` is a TypeScript MCP stdio server for Sim. It exposes workflow and related Sim operations to MCP clients such as Copilot CLI.

## Run locally

Requirements:
- Node.js 20+
- A reachable Sim backend
- A Sim API key

Install and build:

```bash
npm install
npm run build
```

Start the server:

```bash
npm run start
```

## Environment

`npm run start` reads environment variables from the parent process. It does not auto-load
`.env` or `.env.local`. Use `.env.example` as a reference, then provide these values from
your shell or MCP client config:

- `SIM_API_BASE_URL` — base URL for the Sim backend API
- `SIM_API_KEY` — API key for authenticated operations
- `SIM_TIMEOUT` — optional request timeout in ms
- `SIM_RETRIES` — optional retry count
- `LOG_LEVEL` — optional log level

## Copilot CLI example

Add an MCP entry similar to:

```json
{
  "mcpServers": {
    "sim-mcp": {
      "type": "local",
      "command": "npm",
      "args": ["run", "start"],
      "cwd": "/absolute/path/to/sim-mcp",
      "env": {
        "SIM_API_BASE_URL": "http://localhost:3000",
        "SIM_API_KEY": "${SIM_API_KEY}"
      }
    }
  }
}
```

## Authoritative docs

- `README.md` — quick start and environment basics
- `AGENTS.md` — authoritative operational and implementation guidance
