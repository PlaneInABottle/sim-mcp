# AGENTS.md

## 1. Project Purpose & Scope
This repository is a TypeScript MCP (Model Context Protocol) **stdio server** that exposes sim workflow operations to AI clients (e.g., Copilot/Claude). The server runs over stdio, registers MCP tools, and forwards tool calls to the sim backend API.

## 2. Architecture & Key Entrypoints
- **Entrypoints**
  - `src/index.ts`: CLI entry (`sim-mcp --server`) and usage/help.
  - `src/server.ts`: MCP server setup, tool registration, stdio transport.
- **Core Structure**
  - `src/client/`: Sim API client (axios), auth, error mapping.
  - `src/tools/`: MCP tool handlers grouped by domain.
  - `src/schemas/`: Zod schemas for operations and validation.
  - `src/config/`: Environment loading/validation (`zod`).
  - `src/utils/`: Logging utilities (stderr JSON logs).
- **MCP Protocol Flow (stdio)**
  1. `Server` is created with tools capability.
  2. `ListToolsRequestSchema` returns tool metadata.
  3. `CallToolRequestSchema` executes tool handlers.
  4. Responses are JSON-stringified into MCP `content` text; errors use `formatMcpError()` with `isError: true`.

## 3. Environment Setup & Configuration

⚠️ **IMPORTANT: Different contexts use different env files and variable names!**

### Server Runtime (`.env` / `.env.example`)
Used by the MCP server when running in production or local development:
| Variable | Required | Description |
|----------|----------|-------------|
| `SIM_API_BASE_URL` | ✅ Yes | Base URL for Sim API (e.g., `https://api.sim.com`) |
| `SIM_API_KEY` | ✅ Yes | API key for authentication |
| `SIM_TIMEOUT` | No | Request timeout in ms (default: 30000) |
| `SIM_RETRIES` | No | Retry count (default: 3) |
| `LOG_LEVEL` | No | `debug\|info\|warn\|error` (default: `info`) |

Setup: Copy `.env.example` → `.env` and fill in values.

### Local E2E Tests (`.env.local` / `scripts/local-e2e.ts`)
Used **only** for running integration tests locally:
| Variable | Required | Description |
|----------|----------|-------------|
| `SIM_BASE_URL` | ✅ Yes | ⚠️ **NOT** `SIM_API_BASE_URL` — e2e script uses this name |
| `SIM_API_KEY` | ✅ Yes | API key for authentication |
| `TEST_WORKFLOW_ID` | ✅ Yes | Workflow ID to run tests against |

Setup: Create `.env.local` (gitignored) with these values.

**Common Mistake:** Using `SIM_API_BASE_URL` in `.env.local` — the e2e script expects `SIM_BASE_URL`.

## 4. Tool Taxonomy & Constraints

### Auth Context
| Auth Type | Tools |
|-----------|-------|
| **No Auth** (local operation) | `list_tools` |
| **Session Auth** (not API key) | `list_workflows`, `get_workflow` |
| **API Key Auth** | All mutation tools: `replace_workflow_state`, blocks, edges, variables, subflows, custom tools |

### Tool Reference

**Meta**
- `list_tools`: List all available sim-mcp tools with their schemas and descriptions.

**Workflows (Query)** *(session auth)*
- `list_workflows`: list workflows (metadata only).
- `get_workflow`: fetch workflow with blocks/edges; `verbose=true` returns full block config and can be large.

**Workflows (Mutation)** *(API key auth)*
- `replace_workflow_state`: overwrite entire workflow state (destructive).

**Blocks** *(API key auth)*
- `get_block`: retrieve a single block (full config).
- `add_blocks`: add blocks (optionally edges); use for creating loop/parallel blocks.
- `remove_blocks`: remove blocks **and connected edges/subflows**.
- `update_block_name`: rename block.
- `toggle_block_enabled`: enable/disable.
- `update_subblock`: update a block’s subblock (e.g., agent messages).

> 💡 **Tip:** Use `get_workflow(verbose=false)` first to see all blocks and connections, then use `get_block` for detailed config of specific blocks.

**Edges** *(API key auth)*
- `add_edge`: connect blocks.
- `remove_edge`: disconnect by edgeId.

**Variables** *(API key auth)*
- `add_variable`: add workflow variable.
- `remove_variable`: delete variable (references become undefined).

**Subflows** *(API key auth)*
- `update_subflow`: **only updates existing** loop/parallel subflow configs.
  - Subflows are created via `add_blocks` with `type: "loop" | "parallel"`.
  - Subflows are removed via `remove_blocks`.
  - Treat subflow updates as *configuration-only* from the agent perspective.

**Custom Tools** *(API key auth)*
- `list_custom_tools`: list tools in a workspace.
- `upsert_custom_tools`: create/update tools in a workspace.

## 5. Backend Integration (Source of Truth)
- Sim backend schemas are authoritative; align tool inputs with backend Zod schemas and operation names.
- Reference backend locations (from `TESTING.md`):
  - `sim/apps/sim/socket/validation/schemas.ts`
  - `sim/apps/sim/socket/constants.ts`
  - `sim/apps/sim/socket/database/operations.ts`
- **Verify compatibility** by running local integration tests (`scripts/local-e2e.ts`) against a real backend.

## 6. Testing Strategy
- **Unit tests**: `npm test` (Vitest, mocked client).
- **Local integration (recommended for changes to tools)**:
  ```bash
  # .env.local (gitignored)
  SIM_API_KEY=sk-...
  SIM_BASE_URL=http://localhost:3000
  TEST_WORKFLOW_ID=...

  npx tsx scripts/local-e2e.ts
  ```
- Note: Workflow CRUD endpoints require session auth; operation endpoints support API key auth.

## 7. Error Handling & Logging Conventions
- Tool handlers wrap operations in try/catch and log with `getLogger()`.
- API errors are mapped to structured `SimApiError` types (e.g., `RateLimitError`, `ValidationError`).
- MCP error responses use `formatMcpError(error)` and set `isError: true`.
- Logs are JSON written to **stderr** to keep MCP stdout clean.

## 8. Safety & Operational Limits

**For AI Agents — Follow these rules:**

1. **Prompt user for confirmation before destructive operations:**
   - `replace_workflow_state` — overwrites entire workflow
   - `remove_blocks` — deletes blocks AND connected edges/subflows
   - `remove_edge` — disconnects blocks
   - `remove_variable` — references become undefined

2. **List before mutate:** Always call `get_workflow` or `get_block` to verify current state before making changes. Never assume state.

3. **Minimize payload size:**
   - Avoid `get_workflow(verbose=true)` for large workflows
   - Use `get_block` for targeted config inspection

4. **Respect rate limits:** Handle 429 responses gracefully; use default retry behavior unless directed otherwise.

**Example Error Response Format:**
```json
{
  "isError": true,
  "content": [{ "type": "text", "text": "{\"error\": \"ValidationError\", \"message\": \"Block not found\"}" }]
}
```

## 9. Common Patterns (Real Code Examples)
**Add blocks and connect them** (`scripts/local-e2e.ts`):
```ts
await addBlocks(client, {
  workflowId,
  blocks: [
    { id: newBlockId, type: 'agent', name: 'E2E Agent', position: { x: 100, y: 100 } },
    { id: secondBlockId, type: 'agent', name: 'E2E Agent 2', position: { x: 300, y: 100 } },
  ],
});
await addEdgeOp(client, { workflowId, source: newBlockId, target: secondBlockId, edgeId });
```

**Update a subblock (agent messages)** (`scripts/local-e2e.ts`):
```ts
await updateSubblock(client, {
  workflowId,
  blockId: newBlockId,
  subblockId: 'messages',
  value: [{ role: 'user', content: 'test message' }],
});
```

**Update a loop subflow configuration** (`scripts/local-e2e.ts`):
```ts
await addBlocks(client, {
  workflowId,
  blocks: [{ id: loopBlockId, type: 'loop', name: 'E2E Loop', position: { x: 200, y: 200 } }],
});
await updateSubflow(client, { workflowId, id: loopBlockId, type: 'loop', config: { iterations: 10 } });
```

**Get a workflow safely (lightweight)** (`src/tools/workflow/get.ts`):
```ts
const workflow = await client.getWorkflow(workflowId);
const result = verbose ? workflow : stripWorkflowDetails(workflow);
```

## 10. Last Verified
- **Date:** 2026-01-16
- **Context:** Verified against `src/server.ts`, `src/config/env.ts`, `src/tools/*`, and `scripts/local-e2e.ts` in this repo.
