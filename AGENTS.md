# AGENTS.md

## Purpose

`sim-mcp` is a TypeScript MCP stdio server that exposes Sim workflow operations to MCP clients. The server registers a fixed tool surface in `src/server.ts`, validates environment config, forwards requests to the Sim backend API, and returns JSON-stringified results in MCP text content.

## Authoritative sources

When this file and code disagree, trust code in this order:

1. `src/server.ts` — actual MCP tool registration and dispatch
2. `src/tools/**/index.ts` — grouped tool exports
3. individual tool modules in `src/tools/**`

## Entrypoints and structure

- `src/index.ts` — CLI entrypoint (`sim-mcp --server`)
- `src/server.ts` — MCP server creation, tool registration, request handling
- `src/client/` — authenticated Sim API client and error mapping
- `src/tools/` — domain-grouped MCP tools
- `src/config/` — env parsing/validation
- `src/utils/` — structured stderr logging

## Runtime configuration

The server currently requires backend API credentials at startup.

| Variable | Required | Notes |
| --- | --- | --- |
| `SIM_API_BASE_URL` | yes | Base URL for the Sim backend |
| `SIM_API_KEY` | yes | API key used by the HTTP client |
| `SIM_TIMEOUT` | no | Request timeout in ms, default `30000` |
| `SIM_RETRIES` | no | Retry count, default `3` |
| `LOG_LEVEL` | no | `debug`, `info`, `warn`, or `error` |

`src/config/env.ts` is the source of truth for validation and defaults.

## MCP behavior

- Transport: stdio
- Listing tools: `ListToolsRequestSchema`
- Calling tools: `CallToolRequestSchema`
- Successful results: JSON serialized into MCP `content[].text`
- Errors: normalized with `formatMcpError(...)` and returned with `isError: true`
- Logs: structured JSON to stderr so stdout stays MCP-safe

## Current tool surface

### Meta

- `list_tools` — confirm the server is running and list registered tool names/descriptions

### Workflow discovery and lifecycle

- `list_workflows` — list accessible workflows
- `get_workflow` — fetch one workflow; use `verbose=true` only when full block config is required
- `create_workflow` — create a new workflow
- `delete_workflow` — delete a workflow, with template-check handling options
- `get_workflow_status` — inspect deployment/draft status
- `get_deployed_workflow_state` — fetch the currently deployed state
- `deploy_workflow` — deploy the current draft
- `undeploy_workflow` — remove the active deployment

### Deployment version management

- `list_deployment_versions` — list saved deployment versions
- `get_deployment_version` — inspect one deployment version; can optionally include full state
- `activate_deployment_version` — make a prior deployment version active
- `revert_workflow_to_deployment_version` — restore a deployment version back into draft state

### Workflow execution and debug control

- `execute_workflow` — execute a workflow from its trigger entrypoint
- `run_workflow_until_block` — run until a specific block completes
- `run_from_block` — resume from a specific block using a prior execution snapshot
- `run_block` — run a single block in isolation
- `cancel_execution` — cancel an active execution

### Execution logs

- `get_execution_logs` — list/filter execution logs for a workspace
- `get_execution_log_detail` — fetch full detail for one execution log

### Workflow graph editing

#### Blocks

- `get_block` — get one block with full config/subblocks
- `add_blocks` — add one or more blocks
- `remove_blocks` — remove blocks and their connected edges/subflows
- `update_block_name` — rename a block
- `toggle_block_enabled` — enable or disable a block
- `update_block_parent` — set or clear a block parent for nesting
- `update_subblock` — update a block subblock value

#### Edges

- `add_edge` — connect two blocks
- `remove_edge` — remove one edge by id

#### Variables

- `add_variable` — create a workflow variable
- `remove_variable` — remove a workflow variable

#### Subflows

- `update_subflow` — update an existing `loop` or `parallel` container configuration

## Workspace-level assets

### Custom tools

- `list_custom_tools` — list lightweight custom tool metadata
- `get_custom_tool` — fetch one custom tool including schema and code
- `upsert_custom_tools` — create or update custom tools in batch

### Skills

- `list_skills` — list lightweight skill metadata
- `get_skill` — fetch one skill including full content
- `create_skill` — create a new skill
- `update_skill` — update an existing skill
- `delete_skill` — delete a skill

## Usage guidance

- Prefer lightweight reads first:
  - `get_workflow(verbose=false)` before `verbose=true`
  - `get_block` for targeted inspection instead of pulling a full verbose workflow
  - `list_custom_tools` / `list_skills` before `get_*`
- Treat `remove_blocks`, `remove_edge`, `remove_variable`, `delete_workflow`, and deployment version activation/revert operations as potentially destructive.
- `update_subflow` only updates existing loop/parallel containers; creation/removal is handled through block operations.
- This repo’s authoritative surface is the registered MCP tools above; do not rely on older deleted docs or narrower historical tool lists.

## Validation rule for future edits

For documentation updates, validate against:

- `src/server.ts` tool registration list
- `src/tools/index.ts`
- each domain export index under `src/tools/`

This file was last aligned to the tool surface registered in `src/server.ts`.
