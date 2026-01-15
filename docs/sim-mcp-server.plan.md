# sim-mcp - Model Context Protocol Server Implementation Plan

## Executive Summary

- **Objective**: Build a comprehensive MCP server (`sim-mcp/`) that exposes the sim AI workflow platform capabilities to AI clients (Claude, GPT, etc.) as standardized MCP tools
- **Non-goals**: 
  - Replacing the existing sim web UI
  - Implementing real-time collaborative editing via MCP (Socket.io is for web)
  - Exposing internal admin functions
- **Constraints**: 
  - Must use existing sim API endpoints for all operations
  - API key authentication only (no session-based auth)
  - Read-heavy operations should be efficient
  - Must handle rate limiting gracefully
- **Proposed approach**: HTTP API client pattern - MCP server acts as a client to sim's REST API
- **Estimated time**: 18-22 days
- **Total phases**: 5
- **Total commits**: 39
- **Distribution**: Local installation from internal git repository (private, not published to npm)

---

## Current State (Evidence)

### Key Files/Components

| Path | Purpose |
|------|---------|
| `apps/sim/app/api/workflows/` | Workflow CRUD + execute APIs |
| `apps/sim/app/api/workflows/[id]/route.ts` | GET/PUT/DELETE workflow |
| `apps/sim/app/api/workflows/[id]/execute/route.ts` | Execute workflow (800 lines) |
| `apps/sim/app/api/workflows/[id]/state/route.ts` | Save complete workflow state |
| `apps/sim/app/api/workflows/[id]/variables/route.ts` | Manage workflow variables |
| `apps/sim/app/api/workflows/[id]/deploy/route.ts` | Deploy/undeploy workflow |
| `apps/sim/app/api/knowledge/` | Knowledge base management |
| `apps/sim/app/api/mcp/` | Existing MCP client implementation |
| `apps/sim/lib/auth/hybrid.ts` | API key + session authentication |
| `packages/db/schema.ts` | Complete database schema (1780 lines) |
| `apps/sim/stores/workflows/workflow/types.ts` | Workflow TypeScript types |
| `apps/sim/tools/registry.ts` | 600+ tool definitions |
| `apps/sim/blocks/blocks/` | 130+ block type definitions |

### Existing MCP Implementation (for reference)

The sim project already has MCP support for:
1. **MCP Client** (`apps/sim/lib/mcp/client.ts`) - Connects to external MCP servers
2. **MCP Service** (`apps/sim/lib/mcp/service.ts`) - Discovers/executes external MCP tools
3. **Workflow as MCP Server** (`apps/sim/app/api/mcp/serve/[serverId]/route.ts`) - Exposes workflows as MCP tools

Our new `sim-mcp` server is different - it exposes sim's **platform capabilities** as MCP tools.

### Database Schema Highlights

```sql
-- Core tables
workflow (id, userId, workspaceId, name, description, isDeployed, variables)
workflowBlocks (id, workflowId, type, name, positionX, positionY, subBlocks, outputs)
workflowEdges (id, workflowId, sourceBlockId, targetBlockId, sourceHandle, targetHandle)
workflowSubflows (id, workflowId, type, config) -- loops/parallels
workflowExecutionLogs (id, workflowId, executionId, status, executionData)
knowledgeBase (id, userId, workspaceId, name, description, embeddingModel)
document (id, knowledgeBaseId, filename, processingStatus)
embedding (id, documentId, chunkIndex, content, embedding)
apiKey (id, userId, workspaceId, name, key, type)
```

### Authentication Patterns

1. **API Key** - `X-API-Key` header, validated via `authenticateApiKeyFromHeader()`
2. **Session** - Cookie-based via `getSession()`
3. **Internal JWT** - `Authorization: Bearer` for internal services

---

## Requirements

### Functional Requirements

1. **Workflow Management**
   - List, create, read, update, delete workflows
   - Deploy/undeploy workflows
   - Execute workflows with input parameters
   - Monitor execution status and history

2. **Block Operations**
   - Add blocks to workflows
   - Update block properties and positions
   - Remove blocks
   - Enable/disable blocks

3. **Edge/Connection Management**
   - Add edges between blocks
   - Remove edges
   - Update edge properties

4. **Variable Management**
   - List, create, update, delete workflow variables
   - Support variable types: string, number, boolean, object, array

5. **Knowledge Base Operations**
   - List knowledge bases
   - Create/delete knowledge bases
   - Upload/remove documents
   - Search with vector similarity

6. **Execution Management**
   - Trigger workflow execution
   - Get execution status
   - View execution history/logs
   - Cancel running executions

### Non-Functional Requirements

- **Performance**: Response time < 500ms for read operations
- **Reliability**: Graceful error handling with retry logic
- **Security**: API key validation on every request
- **Usability**: Clear tool descriptions for AI clients
- **Maintainability**: TypeScript with full type safety

### Acceptance Criteria

- [ ] All Tier 1 tools implemented and tested
- [ ] Authentication working with sim API keys
- [ ] Error responses are structured and informative
- [ ] Tool schemas follow MCP specification
- [ ] Documentation complete for all tools
- [ ] Integration tests pass against sim API

---

## Proposed Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Client (Claude)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ MCP Protocol (stdio/SSE)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    sim-mcp Server                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   Tool Handlers                         ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   ││
│  │  │ Workflow │ │  Block   │ │   Edge   │ │Knowledge │   ││
│  │  │  Tools   │ │  Tools   │ │  Tools   │ │  Tools   │   ││
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   ││
│  └───────┼────────────┼────────────┼────────────┼─────────┘│
│          │            │            │            │          │
│  ┌───────┴────────────┴────────────┴────────────┴─────────┐│
│  │                   API Client Layer                      ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ││
│  │  │ SimApiClient │  │ Auth Manager │  │ Error Handler│  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      sim Backend API                         │
│         (apps/sim/app/api/*)                                │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
sim-mcp/
├── package.json              # Includes "bin" for CLI entry point
├── tsconfig.json
├── .env.example
├── .gitignore                # Files to exclude from git
├── .copilot-example.json     # Example MCP config for local setup
├── README.md
├── src/
│   ├── index.ts                 # Entry point, MCP server setup
│   ├── server.ts                # MCP server configuration
│   ├── config/
│   │   ├── index.ts             # Configuration loader
│   │   └── env.ts               # Environment variables
│   │
│   ├── client/
│   │   ├── index.ts             # SimApiClient export
│   │   ├── sim-api-client.ts    # HTTP client wrapper
│   │   ├── auth.ts              # API key management
│   │   ├── errors.ts            # Error types
│   │   └── types.ts             # API response types
│   │
│   ├── tools/
│   │   ├── index.ts             # Tool registry
│   │   ├── workflow/
│   │   │   ├── index.ts         # Workflow tool handlers
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   ├── create.ts
│   │   │   ├── update.ts
│   │   │   ├── delete.ts
│   │   │   ├── deploy.ts
│   │   │   └── execute.ts
│   │   │
│   │   ├── block/
│   │   │   ├── index.ts
│   │   │   ├── add.ts
│   │   │   ├── update.ts
│   │   │   ├── remove.ts
│   │   │   └── types.ts         # Block type definitions
│   │   │
│   │   ├── edge/
│   │   │   ├── index.ts
│   │   │   ├── add.ts
│   │   │   └── remove.ts
│   │   │
│   │   ├── variable/
│   │   │   ├── index.ts
│   │   │   ├── list.ts
│   │   │   ├── set.ts
│   │   │   └── delete.ts
│   │   │
│   │   ├── execution/
│   │   │   ├── index.ts
│   │   │   ├── run.ts
│   │   │   ├── status.ts
│   │   │   └── history.ts
│   │   │
│   │   └── knowledge/
│   │       ├── index.ts
│   │       ├── list.ts
│   │       ├── create.ts
│   │       ├── delete.ts
│   │       └── search.ts
│   │
│   ├── schemas/
│   │   ├── index.ts             # Schema exports
│   │   ├── workflow.ts          # Workflow input/output schemas
│   │   ├── block.ts             # Block schemas
│   │   ├── edge.ts              # Edge schemas
│   │   ├── variable.ts          # Variable schemas
│   │   └── knowledge.ts         # Knowledge base schemas
│   │
│   ├── resources/
│   │   ├── index.ts             # MCP resource handlers
│   │   ├── workflow.ts          # Workflow resources
│   │   └── template.ts          # Template resources
│   │
│   └── utils/
│       ├── logger.ts            # Logging utility
│       ├── validation.ts        # Input validation
│       └── retry.ts             # Retry logic
│
├── tests/
│   ├── setup.ts
│   ├── mocks/
│   │   └── sim-api.ts
│   ├── unit/
│   │   ├── tools/
│   │   └── client/
│   └── integration/
│       └── workflows.test.ts
│
└── docs/
    ├── tools.md                 # Tool documentation
    ├── setup.md                 # Setup guide
    └── api-reference.md         # API reference
```

### Tool Definitions

#### Tier 1: Essential (Phase 1-2)

| Tool Name | Description | Input | Output |
|-----------|-------------|-------|--------|
| `list_workflows` | List all workflows for the authenticated user | `{ workspaceId?: string, limit?: number }` | `{ workflows: Workflow[] }` |
| `get_workflow` | Get a single workflow with full details | `{ workflowId: string }` | `{ workflow: WorkflowWithBlocks }` |
| `create_workflow` | Create a new empty workflow | `{ name: string, description?: string, workspaceId: string }` | `{ workflow: Workflow }` |
| `update_workflow` | Update workflow metadata | `{ workflowId: string, name?: string, description?: string }` | `{ workflow: Workflow }` |
| `delete_workflow` | Delete a workflow | `{ workflowId: string }` | `{ success: boolean }` |
| `execute_workflow` | Execute a deployed workflow | `{ workflowId: string, input?: object }` | `{ executionId: string, output: object }` |
| `add_block` | Add a block to a workflow | `{ workflowId: string, type: string, name: string, position: Position }` | `{ block: Block }` |
| `remove_block` | Remove a block from a workflow | `{ workflowId: string, blockId: string }` | `{ success: boolean }` |
| `add_edge` | Connect two blocks | `{ workflowId: string, sourceBlockId: string, targetBlockId: string }` | `{ edge: Edge }` |
| `remove_edge` | Remove a connection | `{ workflowId: string, edgeId: string }` | `{ success: boolean }` |

#### Tier 2: Important (Phase 3)

| Tool Name | Description | Input | Output |
|-----------|-------------|-------|--------|
| `deploy_workflow` | Deploy workflow for API access | `{ workflowId: string }` | `{ success: boolean, apiEndpoint: string }` |
| `undeploy_workflow` | Undeploy a workflow | `{ workflowId: string }` | `{ success: boolean }` |
| `update_block` | Update block properties | `{ workflowId: string, blockId: string, properties: object }` | `{ block: Block }` |
| `update_block_position` | Move a block | `{ workflowId: string, blockId: string, x: number, y: number }` | `{ success: boolean }` |
| `toggle_block` | Enable/disable a block | `{ workflowId: string, blockId: string, enabled: boolean }` | `{ success: boolean }` |
| `list_variables` | List workflow variables | `{ workflowId: string }` | `{ variables: Variable[] }` |
| `set_variable` | Create/update a variable | `{ workflowId: string, name: string, type: string, value: any }` | `{ variable: Variable }` |
| `delete_variable` | Delete a variable | `{ workflowId: string, variableId: string }` | `{ success: boolean }` |
| `get_execution_status` | Check execution status | `{ executionId: string }` | `{ status: string, output?: object }` |
| `get_execution_history` | List past executions | `{ workflowId: string, limit?: number }` | `{ executions: Execution[] }` |

#### Tier 3: Nice-to-Have (Phase 4-5)

| Tool Name | Description | Input | Output |
|-----------|-------------|-------|--------|
| `list_knowledge_bases` | List knowledge bases | `{ workspaceId?: string }` | `{ knowledgeBases: KnowledgeBase[] }` |
| `create_knowledge_base` | Create a knowledge base | `{ name: string, description?: string }` | `{ knowledgeBase: KnowledgeBase }` |
| `delete_knowledge_base` | Delete a knowledge base | `{ knowledgeBaseId: string }` | `{ success: boolean }` |
| `search_knowledge` | Vector search in knowledge base | `{ knowledgeBaseId: string, query: string, limit?: number }` | `{ results: SearchResult[] }` |
| `list_block_types` | List available block types | `{ category?: string }` | `{ blockTypes: BlockType[] }` |
| `get_block_schema` | Get input schema for block type | `{ blockType: string }` | `{ schema: object }` |
| `duplicate_workflow` | Clone a workflow | `{ workflowId: string, name?: string }` | `{ workflow: Workflow }` |
| `import_workflow` | Import workflow from YAML | `{ yaml: string, name?: string }` | `{ workflow: Workflow }` |
| `list_templates` | List workflow templates | `{ category?: string }` | `{ templates: Template[] }` |

### Resource Definitions

```typescript
// MCP Resources exposed by sim-mcp

// Workflow Resource
{
  uri: "sim://workflows/{workflowId}",
  name: "Workflow: {workflowName}",
  description: "Workflow configuration and state",
  mimeType: "application/json"
}

// Template Resource
{
  uri: "sim://templates/{templateId}",
  name: "Template: {templateName}",
  description: "Workflow template for quick start",
  mimeType: "application/json"
}

// Block Type Resource
{
  uri: "sim://block-types/{blockType}",
  name: "Block Type: {blockType}",
  description: "Block type schema and configuration",
  mimeType: "application/json"
}
```

### API Client Design

```typescript
// src/client/sim-api-client.ts

export interface SimApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retries?: number;
}

export class SimApiClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retries: number;

  constructor(config: SimApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
    this.retries = config.retries ?? 3;
  }

  // Workflow operations
  async listWorkflows(params?: ListWorkflowsParams): Promise<Workflow[]>;
  async getWorkflow(workflowId: string): Promise<WorkflowWithBlocks>;
  async createWorkflow(data: CreateWorkflowData): Promise<Workflow>;
  async updateWorkflow(workflowId: string, data: UpdateWorkflowData): Promise<Workflow>;
  async deleteWorkflow(workflowId: string): Promise<void>;
  async deployWorkflow(workflowId: string): Promise<DeployResult>;
  async executeWorkflow(workflowId: string, input?: object): Promise<ExecutionResult>;

  // Block operations
  async addBlock(workflowId: string, block: BlockData): Promise<Block>;
  async updateBlock(workflowId: string, blockId: string, data: UpdateBlockData): Promise<Block>;
  async removeBlock(workflowId: string, blockId: string): Promise<void>;

  // Edge operations
  async addEdge(workflowId: string, edge: EdgeData): Promise<Edge>;
  async removeEdge(workflowId: string, edgeId: string): Promise<void>;

  // Variable operations
  async listVariables(workflowId: string): Promise<Variable[]>;
  async setVariable(workflowId: string, variable: VariableData): Promise<Variable>;
  async deleteVariable(workflowId: string, variableId: string): Promise<void>;

  // Execution operations
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus>;
  async getExecutionHistory(workflowId: string, limit?: number): Promise<Execution[]>;

  // Knowledge base operations
  async listKnowledgeBases(workspaceId?: string): Promise<KnowledgeBase[]>;
  async createKnowledgeBase(data: CreateKnowledgeBaseData): Promise<KnowledgeBase>;
  async deleteKnowledgeBase(knowledgeBaseId: string): Promise<void>;
  async searchKnowledge(knowledgeBaseId: string, query: string, limit?: number): Promise<SearchResult[]>;
}
```

### Error Handling Strategy

```typescript
// src/client/errors.ts

export class SimApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: object
  ) {
    super(message);
    this.name = 'SimApiError';
  }
}

export class AuthenticationError extends SimApiError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends SimApiError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends SimApiError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 404, 'NOT_FOUND', { resource, id });
  }
}

export class ValidationError extends SimApiError {
  constructor(message: string, details: object) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class RateLimitError extends SimApiError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_ERROR', { retryAfter });
  }
}
```

---

## Implementation Plan (Phased)

### Phase 1: Core Setup & Infrastructure (3-4 days)

**Commits in this phase: 8**

#### Commit 1: Initialize project structure
- Steps:
  1. Create `sim-mcp/` directory
  2. Initialize npm package with `package.json` including:
     - `"bin": { "sim-mcp": "./dist/index.js" }` for CLI entry point
     - `"files": ["dist"]` (useful for local builds)
     - `"private": true` (prevents accidental npm publish)
  3. Configure TypeScript with `tsconfig.json`
  4. Add `.gitignore`, `.env.example`
  5. Create `.copilot-example.json` with local MCP config template
- Files: `sim-mcp/package.json`, `sim-mcp/tsconfig.json`, `sim-mcp/.gitignore`, `sim-mcp/.env.example`, `sim-mcp/.copilot-example.json`
- New/modified lines: ~120
- Tests/validation: `npm install` succeeds
- Value delivered: Project scaffold ready for local development
- Independently committable: yes

**package.json key sections:**
```json
{
  "name": "sim-mcp",
  "version": "0.0.1",
  "private": true,
  "bin": {
    "sim-mcp": "./dist/index.js"
  },
  "files": ["dist"],
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

**.copilot-example.json template (local installation):**
```json
{
  "mcpServers": {
    "sim-mcp": {
      "tools": ["*"],
      "type": "local",
      "command": "npm",
      "args": ["run", "start"],
      "cwd": "/full/path/to/sim-mcp",
      "env": {
        "SIM_API_BASE_URL": "http://localhost:3000",
        "SIM_API_KEY": "${SIM_API_KEY}"
      }
    }
  }
}
```

#### Commit 2: Add core dependencies
- Steps:
  1. Install `@modelcontextprotocol/sdk`
  2. Install `zod` for validation
  3. Install `axios` for HTTP
  4. Install dev dependencies (TypeScript, vitest, etc.)
- Files: `sim-mcp/package.json`
- New/modified lines: ~30
- Tests/validation: `npm install` succeeds
- Value delivered: Dependencies available
- Independently committable: yes

#### Commit 3: Create configuration module
- Steps:
  1. Create `src/config/env.ts` for environment variables
  2. Create `src/config/index.ts` for config export
  3. Add Zod schema for config validation
- Files: `sim-mcp/src/config/env.ts`, `sim-mcp/src/config/index.ts`
- New/modified lines: ~80
- Tests/validation: Config loads from environment
- Value delivered: Configuration management
- Independently committable: yes

#### Commit 4: Implement logging utility
- Steps:
  1. Create `src/utils/logger.ts`
  2. Implement structured logging with levels
  3. Add request/response logging helpers
- Files: `sim-mcp/src/utils/logger.ts`
- New/modified lines: ~60
- Tests/validation: Logger outputs correctly
- Value delivered: Debugging capability
- Independently committable: yes

#### Commit 5: Create error types and handlers
- Steps:
  1. Create `src/client/errors.ts` with error classes
  2. Implement error mapping from HTTP responses
  3. Add MCP error response formatter
- Files: `sim-mcp/src/client/errors.ts`
- New/modified lines: ~120
- Tests/validation: Error classes instantiate correctly
- Value delivered: Structured error handling
- Independently committable: yes

#### Commit 6: Implement SimApiClient base
- Steps:
  1. Create `src/client/sim-api-client.ts`
  2. Implement HTTP request wrapper with retry logic
  3. Add authentication header injection
  4. Implement timeout and error handling
- Files: `sim-mcp/src/client/sim-api-client.ts`, `sim-mcp/src/client/types.ts`
- New/modified lines: ~200
- Tests/validation: Client can make authenticated requests
- Value delivered: API communication foundation
- Independently committable: yes

#### Commit 7: Create MCP server entry point
- Steps:
  1. Create `src/index.ts` as CLI entry point with shebang (`#!/usr/bin/env node`)
  2. Parse `--server` flag to start MCP server
  3. Create `src/server.ts` with MCP server setup
  4. Implement stdio transport for MCP communication
  5. Add graceful shutdown handling
- Files: `sim-mcp/src/index.ts`, `sim-mcp/src/server.ts`
- New/modified lines: ~120
- Tests/validation: `npm run start` starts MCP server on stdio
- Value delivered: MCP server running via local npm script
- Independently committable: yes

**Entry point pattern (src/index.ts):**
```typescript
#!/usr/bin/env node
import { startServer } from './server';

const args = process.argv.slice(2);

if (args.includes('--server') || args.includes('-s')) {
  startServer();
} else {
  console.log('Usage: sim-mcp --server');
  console.log('  --server, -s  Start MCP server on stdio');
  process.exit(0);
}
```

#### Commit 8: Add build scripts and dev tooling
- Steps:
  1. Add build script to `package.json`
  2. Add dev script with watch mode
  3. Add lint configuration (ESLint/Biome)
  4. Create `README.md` with local setup instructions including MCP config
- Files: `sim-mcp/package.json`, `sim-mcp/README.md`
- New/modified lines: ~200
- Tests/validation: `npm run build` produces valid output
- Value delivered: Development workflow ready for local use
- Independently committable: yes

**package.json scripts:**
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js --server",
    "lint": "biome check .",
    "test": "vitest"
  }
}
```

---

### Phase 2: Workflow CRUD Tools (4-5 days)

**Commits in this phase: 9**

#### Commit 9: Create workflow type definitions
- Steps:
  1. Create `src/schemas/workflow.ts` with Zod schemas
  2. Define Workflow, Block, Edge types
  3. Map to sim's type system
- Files: `sim-mcp/src/schemas/workflow.ts`
- New/modified lines: ~150
- Tests/validation: Types compile correctly
- Value delivered: Type-safe workflow handling
- Independently committable: yes

#### Commit 10: Implement list_workflows tool
- Steps:
  1. Create `src/tools/workflow/list.ts`
  2. Add pagination support
  3. Add workspace filtering
  4. Register tool with MCP server
- Files: `sim-mcp/src/tools/workflow/list.ts`, `sim-mcp/src/tools/workflow/index.ts`
- New/modified lines: ~100
- Tests/validation: Tool returns workflow list
- Value delivered: Users can browse workflows
- Independently committable: yes

#### Commit 11: Implement get_workflow tool
- Steps:
  1. Create `src/tools/workflow/get.ts`
  2. Include blocks, edges in response
  3. Handle not found errors
- Files: `sim-mcp/src/tools/workflow/get.ts`
- New/modified lines: ~80
- Tests/validation: Tool returns full workflow
- Value delivered: Users can view workflow details
- Independently committable: yes

#### Commit 12: Implement create_workflow tool
- Steps:
  1. Create `src/tools/workflow/create.ts`
  2. Validate input with Zod
  3. Call sim API to create workflow
  4. Return created workflow
- Files: `sim-mcp/src/tools/workflow/create.ts`
- New/modified lines: ~90
- Tests/validation: Tool creates new workflow
- Value delivered: Users can create workflows
- Independently committable: yes

#### Commit 13: Implement update_workflow tool
- Steps:
  1. Create `src/tools/workflow/update.ts`
  2. Support partial updates
  3. Validate workflow exists
- Files: `sim-mcp/src/tools/workflow/update.ts`
- New/modified lines: ~80
- Tests/validation: Tool updates workflow metadata
- Value delivered: Users can rename workflows
- Independently committable: yes

#### Commit 14: Implement delete_workflow tool
- Steps:
  1. Create `src/tools/workflow/delete.ts`
  2. Confirm deletion
  3. Handle cleanup
- Files: `sim-mcp/src/tools/workflow/delete.ts`
- New/modified lines: ~60
- Tests/validation: Tool deletes workflow
- Value delivered: Users can remove workflows
- Independently committable: yes

#### Commit 15: Implement execute_workflow tool
- Steps:
  1. Create `src/tools/workflow/execute.ts`
  2. Support input parameters
  3. Handle sync/async execution
  4. Return execution result
- Files: `sim-mcp/src/tools/workflow/execute.ts`
- New/modified lines: ~120
- Tests/validation: Tool executes workflow
- Value delivered: Users can run workflows
- Independently committable: yes

#### Commit 16: Add SimApiClient workflow methods
- Steps:
  1. Add `listWorkflows()` to client
  2. Add `getWorkflow()` to client
  3. Add `createWorkflow()` to client
  4. Add `updateWorkflow()` to client
  5. Add `deleteWorkflow()` to client
  6. Add `executeWorkflow()` to client
- Files: `sim-mcp/src/client/sim-api-client.ts`
- New/modified lines: ~200
- Tests/validation: All client methods work
- Value delivered: Complete workflow API coverage
- Independently committable: yes

#### Commit 17: Add unit tests for workflow tools
- Steps:
  1. Create test setup with mocks
  2. Test each workflow tool
  3. Test error cases
- Files: `sim-mcp/tests/unit/tools/workflow.test.ts`, `sim-mcp/tests/mocks/sim-api.ts`
- New/modified lines: ~300
- Tests/validation: All tests pass
- Value delivered: Quality assurance
- Independently committable: yes

---

### Phase 3: Block & Edge Operations (4-5 days)

**Commits in this phase: 8**

#### Commit 18: Create block type definitions
- Steps:
  1. Create `src/schemas/block.ts` with Zod schemas
  2. Define block types enum (130+ types)
  3. Define position, subBlocks schemas
- Files: `sim-mcp/src/schemas/block.ts`
- New/modified lines: ~200
- Tests/validation: Types compile correctly
- Value delivered: Type-safe block handling
- Independently committable: yes

#### Commit 19: Implement add_block tool
- Steps:
  1. Create `src/tools/block/add.ts`
  2. Validate block type exists
  3. Generate block ID
  4. Update workflow state
- Files: `sim-mcp/src/tools/block/add.ts`, `sim-mcp/src/tools/block/index.ts`
- New/modified lines: ~120
- Tests/validation: Tool adds block to workflow
- Value delivered: Users can add blocks
- Independently committable: yes

#### Commit 20: Implement update_block tool
- Steps:
  1. Create `src/tools/block/update.ts`
  2. Support property updates
  3. Validate block exists
- Files: `sim-mcp/src/tools/block/update.ts`
- New/modified lines: ~100
- Tests/validation: Tool updates block properties
- Value delivered: Users can configure blocks
- Independently committable: yes

#### Commit 21: Implement remove_block tool
- Steps:
  1. Create `src/tools/block/remove.ts`
  2. Remove connected edges
  3. Update workflow state
- Files: `sim-mcp/src/tools/block/remove.ts`
- New/modified lines: ~80
- Tests/validation: Tool removes block and edges
- Value delivered: Users can delete blocks
- Independently committable: yes

#### Commit 22: Create edge type definitions
- Steps:
  1. Create `src/schemas/edge.ts` with Zod schemas
  2. Define edge types
  3. Define handle schemas
- Files: `sim-mcp/src/schemas/edge.ts`
- New/modified lines: ~60
- Tests/validation: Types compile correctly
- Value delivered: Type-safe edge handling
- Independently committable: yes

#### Commit 23: Implement add_edge tool
- Steps:
  1. Create `src/tools/edge/add.ts`
  2. Validate source/target blocks exist
  3. Generate edge ID
  4. Update workflow state
- Files: `sim-mcp/src/tools/edge/add.ts`, `sim-mcp/src/tools/edge/index.ts`
- New/modified lines: ~100
- Tests/validation: Tool adds edge to workflow
- Value delivered: Users can connect blocks
- Independently committable: yes

#### Commit 24: Implement remove_edge tool
- Steps:
  1. Create `src/tools/edge/remove.ts`
  2. Validate edge exists
  3. Update workflow state
- Files: `sim-mcp/src/tools/edge/remove.ts`
- New/modified lines: ~70
- Tests/validation: Tool removes edge
- Value delivered: Users can disconnect blocks
- Independently committable: yes

#### Commit 25: Add SimApiClient block/edge methods
- Steps:
  1. Add block methods to client
  2. Add edge methods to client
  3. Implement state update pattern
- Files: `sim-mcp/src/client/sim-api-client.ts`
- New/modified lines: ~180
- Tests/validation: All client methods work
- Value delivered: Complete block/edge API coverage
- Independently committable: yes

---

### Phase 4: Variables, Execution & Deploy (3-4 days)

**Commits in this phase: 7**

#### Commit 26: Create variable type definitions
- Steps:
  1. Create `src/schemas/variable.ts` with Zod schemas
  2. Define variable types (string, number, boolean, object, array)
- Files: `sim-mcp/src/schemas/variable.ts`
- New/modified lines: ~50
- Tests/validation: Types compile correctly
- Value delivered: Type-safe variable handling
- Independently committable: yes

#### Commit 27: Implement variable tools
- Steps:
  1. Create `src/tools/variable/list.ts`
  2. Create `src/tools/variable/set.ts`
  3. Create `src/tools/variable/delete.ts`
- Files: `sim-mcp/src/tools/variable/*.ts`
- New/modified lines: ~180
- Tests/validation: Tools manage variables correctly
- Value delivered: Users can manage workflow variables
- Independently committable: yes

#### Commit 28: Implement deploy/undeploy tools
- Steps:
  1. Create `src/tools/workflow/deploy.ts`
  2. Return API endpoint URL
  3. Handle deployment status
- Files: `sim-mcp/src/tools/workflow/deploy.ts`
- New/modified lines: ~100
- Tests/validation: Tools deploy/undeploy correctly
- Value delivered: Users can publish workflows
- Independently committable: yes

#### Commit 29: Implement execution status tool
- Steps:
  1. Create `src/tools/execution/status.ts`
  2. Query execution logs
  3. Return current status
- Files: `sim-mcp/src/tools/execution/status.ts`, `sim-mcp/src/tools/execution/index.ts`
- New/modified lines: ~80
- Tests/validation: Tool returns execution status
- Value delivered: Users can monitor executions
- Independently committable: yes

#### Commit 30: Implement execution history tool
- Steps:
  1. Create `src/tools/execution/history.ts`
  2. Support pagination
  3. Filter by workflow
- Files: `sim-mcp/src/tools/execution/history.ts`
- New/modified lines: ~90
- Tests/validation: Tool returns execution history
- Value delivered: Users can view past runs
- Independently committable: yes

#### Commit 31: Add SimApiClient variable/execution methods
- Steps:
  1. Add variable methods to client
  2. Add deployment methods to client
  3. Add execution methods to client
- Files: `sim-mcp/src/client/sim-api-client.ts`
- New/modified lines: ~150
- Tests/validation: All client methods work
- Value delivered: Complete variable/execution API coverage
- Independently committable: yes

#### Commit 32: Add unit tests for Phase 4 tools
- Steps:
  1. Test variable tools
  2. Test deploy tools
  3. Test execution tools
- Files: `sim-mcp/tests/unit/tools/variable.test.ts`, `sim-mcp/tests/unit/tools/execution.test.ts`
- New/modified lines: ~250
- Tests/validation: All tests pass
- Value delivered: Quality assurance
- Independently committable: yes

---

### Phase 5: Knowledge Base & Polish (4 days)

**Commits in this phase: 7**

#### Commit 33: Create knowledge base type definitions
- Steps:
  1. Create `src/schemas/knowledge.ts` with Zod schemas
  2. Define KnowledgeBase, Document, SearchResult types
- Files: `sim-mcp/src/schemas/knowledge.ts`
- New/modified lines: ~80
- Tests/validation: Types compile correctly
- Value delivered: Type-safe KB handling
- Independently committable: yes

#### Commit 34: Implement knowledge base tools
- Steps:
  1. Create `src/tools/knowledge/list.ts`
  2. Create `src/tools/knowledge/create.ts`
  3. Create `src/tools/knowledge/delete.ts`
  4. Create `src/tools/knowledge/search.ts`
- Files: `sim-mcp/src/tools/knowledge/*.ts`
- New/modified lines: ~250
- Tests/validation: Tools manage KB correctly
- Value delivered: Users can manage knowledge bases
- Independently committable: yes

#### Commit 35: Implement MCP resources
- Steps:
  1. Create `src/resources/workflow.ts` for workflow resources
  2. Create `src/resources/template.ts` for template resources
  3. Register resources with MCP server
- Files: `sim-mcp/src/resources/*.ts`
- New/modified lines: ~150
- Tests/validation: Resources accessible via MCP
- Value delivered: Rich context for AI clients
- Independently committable: yes

#### Commit 36: Add list_block_types tool
- Steps:
  1. Create `src/tools/block/types.ts`
  2. Return available block types from sim
  3. Include descriptions and categories
- Files: `sim-mcp/src/tools/block/types.ts`
- New/modified lines: ~100
- Tests/validation: Tool returns block types
- Value delivered: Users can discover blocks
- Independently committable: yes

#### Commit 37: Add integration tests
- Steps:
  1. Create integration test setup
  2. Test workflow lifecycle
  3. Test block/edge operations
  4. Test execution flow
- Files: `sim-mcp/tests/integration/*.test.ts`
- New/modified lines: ~400
- Tests/validation: Integration tests pass
- Value delivered: End-to-end validation
- Independently committable: yes

#### Commit 38: Create comprehensive documentation
- Steps:
  1. Create `docs/tools.md` with all tool docs
  2. Create `docs/setup.md` with local setup guide including MCP config
  3. Create `docs/api-reference.md`
  4. Update `README.md` with quick start (clone, build, configure)
- Files: `sim-mcp/docs/*.md`, `sim-mcp/README.md`
- New/modified lines: ~600
- Tests/validation: Docs are complete and accurate
- Value delivered: Developer documentation for internal use
- Independently committable: yes

#### Commit 39: Setup local installation and final polish
- Steps:
  1. Configure package.json for local/private use (`"private": true`)
  2. Add version info and internal repository fields
  3. Create `CHANGELOG.md`
  4. Create `INSTALLATION.md` with internal setup guide
  5. Review all tools for consistency
  6. Final testing and linting
- Files: `sim-mcp/package.json`, `sim-mcp/CHANGELOG.md`, `sim-mcp/INSTALLATION.md`
- New/modified lines: ~120
- Tests/validation: `npm run build && npm test` succeeds
- Value delivered: Production-ready local package for internal use
- Independently committable: yes

**package.json configuration (local/private):**
```json
{
  "name": "sim-mcp",
  "version": "1.0.0",
  "private": true,
  "description": "MCP server for sim AI workflow platform (internal use only)",
  "keywords": ["mcp", "sim", "workflow", "ai"],
  "author": "sim team",
  "license": "UNLICENSED",
  "repository": {
    "type": "git",
    "url": "<internal-repository-url>"
  }
}
```

**.gitignore:**
```
node_modules/
dist/
*.log
.env
.env.local
.DS_Store
```

---

## Summary

- **Total commits**: 39
- **Total new code**: ~4,500 lines
- **Total removed**: ~0 lines (new project)
- **Net change**: ~4,500 lines
- **Total estimated time**: 18-22 days
- **Distribution**: Local installation from internal git repository (private, not published to npm)

### Benefits Achieved

- [ ] AI clients can manage sim workflows via MCP
- [ ] Full CRUD operations for workflows, blocks, edges
- [ ] Workflow execution and monitoring
- [ ] Knowledge base integration
- [ ] Type-safe implementation
- [ ] Comprehensive documentation
- [ ] Local installation from internal git repo
- [ ] Works offline after initial clone (no registry needed)

### Backward Compatibility

- [ ] Uses existing sim API endpoints (no sim changes required)
- [ ] API key authentication compatible with existing keys
- [ ] No breaking changes to sim project

---

## Progress Tracking

- [ ] Phase 1: Core Setup (0/8 commits)
- [ ] Phase 2: Workflow CRUD (0/9 commits)
- [ ] Phase 3: Block & Edge (0/8 commits)
- [ ] Phase 4: Variables & Execution (0/7 commits)
- [ ] Phase 5: Knowledge Base & Polish (0/7 commits)

---

## Questions/Decisions Needed

1. **API Base URL**: Should the MCP server support multiple sim environments (dev, staging, prod)?
   - **Recommendation**: Yes, use `SIM_API_BASE_URL` environment variable

2. **Workspace Context**: Should a default workspace be required, or allow per-request workspace selection?
   - **Recommendation**: Require default workspace in config, allow override per-request

3. **Rate Limiting**: Should the MCP server implement its own rate limiting, or rely on sim's?
   - **Recommendation**: Rely on sim's rate limiting, handle 429 responses gracefully

4. **Block Subblock Configuration**: How should the MCP server handle complex subBlock configurations?
   - **Recommendation**: Accept raw JSON for subBlocks, validate against block type schema

5. **Real-time Updates**: Should the MCP server support Socket.io for real-time workflow updates?
   - **Recommendation**: No, keep it simple with REST API. Real-time is for web UI.

---

## Testing Strategy

### Unit Tests

- Mock SimApiClient for isolated tool testing
- Test all error scenarios
- Test input validation
- Coverage target: 80%+

### Integration Tests

- Run against local sim instance
- Test complete workflows
- Test authentication edge cases
- Require sim backend running

### Performance Checks

- Response time benchmarks
- Concurrent request handling
- Memory usage profiling

### Security Checks

- API key validation
- Input sanitization
- No credential leakage in logs

---

## MCP Configuration

### Quick Start (Local Installation)

Developers clone the repo, build locally, then configure in Copilot CLI:

```bash
# 1. Clone sim-mcp from internal repository
git clone <internal-repo-url> sim-mcp
cd sim-mcp

# 2. Install dependencies and build
npm install
npm run build

# 3. Add to ~/.copilot/mcp-config.json
# See configuration below

# 4. Set environment variable
export SIM_API_KEY="your-api-key-here"

# 5. Run Copilot CLI
copilot
```

### MCP Config (Local Installation)

Add sim-mcp to your Copilot CLI config at `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "sim-mcp": {
      "tools": ["*"],
      "type": "local",
      "command": "npm",
      "args": ["run", "start"],
      "cwd": "/full/path/to/sim-mcp",
      "env": {
        "SIM_API_BASE_URL": "http://localhost:3000",
        "SIM_API_KEY": "${SIM_API_KEY}"
      }
    }
  }
}
```

**Alternative (direct node execution):**
```json
{
  "mcpServers": {
    "sim-mcp": {
      "tools": ["*"],
      "type": "local",
      "command": "node",
      "args": ["/full/path/to/sim-mcp/dist/index.js", "--server"],
      "env": {
        "SIM_API_BASE_URL": "http://localhost:3000",
        "SIM_API_KEY": "${SIM_API_KEY}"
      }
    }
  }
}
```

### Environment Variables

Users must set their API key in their shell:

```bash
# Add to ~/.bashrc, ~/.zshrc, or equivalent
export SIM_API_KEY="your-api-key-here"
```

### Configuration Options

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SIM_API_BASE_URL` | Yes | - | Base URL of sim backend API |
| `SIM_API_KEY` | Yes | - | API key for authentication |
| `SIM_TIMEOUT` | No | 30000 | Request timeout in ms |
| `SIM_RETRIES` | No | 3 | Number of retry attempts |

---

## Development Workflow

### Initial Setup (Clone from Internal Repo)

```bash
# 1. Clone the repo from internal repository
git clone <internal-repo-url> sim-mcp
cd sim-mcp

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Verify build succeeded
ls dist/index.js
```

### Local Development

```bash
# Build
npm run build

# Run locally (for testing)
node dist/index.js --server
# Or
npm run start
```

### Configure Copilot CLI

Add to your `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "sim-mcp": {
      "tools": ["*"],
      "type": "local",
      "command": "npm",
      "args": ["run", "start"],
      "cwd": "/full/path/to/sim-mcp",
      "env": {
        "SIM_API_BASE_URL": "http://localhost:3000",
        "SIM_API_KEY": "${SIM_API_KEY}"
      }
    }
  }
}
```

Then run Copilot CLI:
```bash
copilot
# sim-mcp tools are now available
```

### Watch Mode Development

```bash
# Terminal 1: Watch and rebuild
npm run dev

# Terminal 2: Test with Copilot CLI
copilot
```

### Running Tests

```bash
# Unit tests
npm test

# Integration tests (requires sim backend)
SIM_API_BASE_URL=http://localhost:3000 npm run test:integration
```

---

## CI/CD Pipeline

### GitHub Actions Workflow (Testing Only)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

**Note:** No npm publish workflow - this is an internal package only.

### Release Process (Internal)

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. Team members pull latest and rebuild locally

---

## Rollout & Rollback

### Rollout Plan (Internal)

1. **Alpha**: Internal testing with development sim instance
2. **Beta**: Team-wide testing from internal git repository
3. **GA**: Available in internal repository with documentation

### Local Installation

```bash
# Clone from internal repository
git clone <internal-repo-url> sim-mcp
cd sim-mcp

# Install dependencies and build
npm install
npm run build

# Configure in ~/.copilot/mcp-config.json
# Point to local build directory

# Run Copilot CLI
copilot
```

**Note:** This package is NOT published to npm registry. Each developer clones and builds locally.

### Rollback Plan

- MCP server is independent project, can be disabled without affecting sim
- No database migrations required
- Users can revert to web UI for all operations
- Simply remove from `~/.copilot/mcp-config.json` to disable

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| sim API changes break MCP tools | Medium | High | Version pin sim API, add integration tests |
| Complex block configs hard to express | Medium | Medium | Provide helper tools for common patterns |
| Rate limiting causes poor UX | Low | Medium | Implement exponential backoff, cache reads |
| Auth tokens expire during long operations | Low | Low | Refresh tokens, retry logic |
| Performance issues with large workflows | Low | Medium | Pagination, lazy loading |

---

## Dependencies & Libraries

### Core

| Package | Purpose | Version |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server implementation | `^1.0.0` |
| `zod` | Schema validation | `^3.23.0` |
| `axios` | HTTP client | `^1.7.0` |

### Development

| Package | Purpose | Version |
|---------|---------|---------|
| `typescript` | Type safety | `^5.4.0` |
| `vitest` | Unit testing | `^2.0.0` |
| `@types/node` | Node.js types | `^20.0.0` |
| `tsx` | TypeScript execution | `^4.0.0` |

### Optional

| Package | Purpose | Version |
|---------|---------|---------|
| `pino` | Structured logging | `^9.0.0` |
| `p-retry` | Retry logic | `^6.0.0` |

---

## Appendix: Block Types Reference

The sim platform supports 130+ block types across these categories:

### Triggers
- `api_trigger`, `webhook`, `schedule`, `manual_trigger`, `chat_trigger`, `input_trigger`

### AI/ML
- `agent`, `openai`, `vision`, `stt`, `tts`, `evaluator`, `thinking`

### Integration (Sample)
- `slack`, `github`, `gmail`, `notion`, `jira`, `linear`, `salesforce`

### Data
- `postgresql`, `mongodb`, `mysql`, `neo4j`, `supabase`, `pinecone`, `qdrant`

### Logic
- `condition`, `router`, `function`, `parallel`, `wait`, `response`

### Knowledge
- `knowledge`, `memory`, `mcp`

Full list available in `apps/sim/blocks/blocks/`.

---

## Appendix: API Endpoint Mapping

| MCP Tool | sim API Endpoint | Method |
|----------|------------------|--------|
| `list_workflows` | `/api/workflows` | GET |
| `get_workflow` | `/api/workflows/{id}` | GET |
| `create_workflow` | `/api/workflows` | POST |
| `update_workflow` | `/api/workflows/{id}` | PUT |
| `delete_workflow` | `/api/workflows/{id}` | DELETE |
| `execute_workflow` | `/api/workflows/{id}/execute` | POST |
| `deploy_workflow` | `/api/workflows/{id}/deploy` | POST |
| `get_workflow_state` | `/api/workflows/{id}/state` | GET |
| `save_workflow_state` | `/api/workflows/{id}/state` | PUT |
| `list_variables` | `/api/workflows/{id}/variables` | GET |
| `set_variables` | `/api/workflows/{id}/variables` | POST |
| `list_executions` | `/api/workflows/{id}/executions` | GET |
| `get_execution` | `/api/logs/{executionId}` | GET |
| `list_knowledge_bases` | `/api/knowledge` | GET |
| `create_knowledge_base` | `/api/knowledge` | POST |
| `delete_knowledge_base` | `/api/knowledge/{id}` | DELETE |
| `search_knowledge` | `/api/knowledge/search` | POST |
