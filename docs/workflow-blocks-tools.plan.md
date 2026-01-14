# Workflow Blocks Tools Implementation Plan

## Executive Summary

- **Objective**: Create new sim-mcp tools to retrieve workflow blocks without downloading the entire workflow export
- **Non-goals**: Backend API changes, modifying existing tools, new block manipulation operations
- **Constraints**: Client-side only changes, reuse existing `getWorkflow` API endpoint, follow existing tool patterns
- **Proposed approach**: Create two new client-side tools (`list_blocks`, `get_block`) that extract blocks from `getWorkflow` response with filtering support
- **Estimated time**: 2 days
- **Total phases**: 3
- **Total commits**: 6

## Current State (Evidence)

### Key Files/Components

| File | Lines | Description |
|------|-------|-------------|
| `src/tools/workflow/get.ts` | 89 | Returns `WorkflowWithBlocks` - already includes blocks array |
| `src/tools/workflow/export.ts` | 81 | Returns full export with `state.blocks` as Record |
| `src/client/sim-api-client.ts:354-365` | 11 | `getWorkflow()` method - flattens blocks Record to array |
| `src/schemas/workflow.ts:51-62` | 11 | `BlockSchema` definition |
| `src/schemas/block.ts:14-81` | 67 | `BlockTypeEnum` with 130+ block types |
| `src/server.ts:146-238` | 92 | Tool registration pattern |

### Current Behavior

1. **`get_workflow`**: Calls `getWorkflow()` which fetches `/api/workflows/{id}` and returns:
   - Full workflow metadata (id, name, description, etc.)
   - `blocks[]` - array of all blocks (flattened from Record)
   - `edges[]` - array of all edges
   
2. **`export_workflow`**: Calls `exportWorkflow()` which fetches same endpoint and returns:
   - Workflow metadata
   - `state.blocks` - Record<blockId, block>
   - `state.edges`, `state.loops`, `state.parallels`, `state.variables`

### Current Problems

1. **No lightweight block access**: To get block info, must call `get_workflow` or `export_workflow` - both return full workflow
2. **No filtering capability**: No way to filter blocks by type, name, or ID without client-side processing
3. **Redundant data**: When LLM only needs blocks, it receives edges, variables, subflows unnecessarily

### Key Architecture Decisions

**Q1: Use export_workflow + extract state.blocks, or query backend directly?**
- **Answer**: Use `getWorkflow()` (same as `get_workflow` tool) for efficiency
- **Rationale**: 
  - Backend has no dedicated blocks-only endpoint
  - Creating new backend endpoints requires platform changes (out of scope)
  - `getWorkflow()` already flattens blocks to array format
  - Client-side filtering is fast and avoids platform coupling

**Q2: What tool signatures are most useful?**
- **Answer**: Two tools:
  1. `list_blocks(workflowId, filters?)` - List blocks with optional filtering
  2. `get_block(workflowId, blockId)` - Get single block by ID
- **Rationale**: Follows existing patterns (`list_workflows`/`get_workflow`)

**Q3: Should we support filtering by block type, name, or ID?**
- **Answer**: Yes, all three plus `enabled` status
- **Rationale**: Common use cases require finding specific block types (agents, triggers) or searching by name

**Q4: What should the response structure be?**
- **Answer**: 
  - `list_blocks`: `{ blocks: Block[], total: number, filtered: number }`
  - `get_block`: `{ block: Block }`

**Q5: How does this fit with existing tools?**
- **Answer**: Complements `get_workflow` - use `list_blocks` for lightweight block queries, `get_workflow` when you need edges/full structure

**Q6: Edge cases to consider?**
- Empty blocks array (valid, return empty array)
- Block not found (throw descriptive error)
- Invalid workflowId (let API error propagate)
- Large block counts (pagination optional, initial implementation returns all)

## Requirements

### Functional

1. `list_blocks` tool must return array of blocks from a workflow
2. `list_blocks` must support optional filtering by: `type`, `name` (partial match), `ids`, `enabled`
3. `get_block` tool must return single block by ID
4. Both tools must return proper error messages for not-found scenarios
5. Response must include block fields: id, type, name, position, enabled, subBlocks, outputs

### Non-Functional

- **Performance**: Client-side filtering on blocks array (typically <100 blocks per workflow)
- **Reliability**: Proper error handling for workflow not found, block not found
- **Usability**: Descriptive error messages, helpful tool descriptions

### Acceptance Criteria

- [ ] `list_blocks` returns all blocks when no filters provided
- [ ] `list_blocks` filters correctly by each filter type
- [ ] `list_blocks` returns `total` and `filtered` counts
- [ ] `get_block` returns single block when found
- [ ] `get_block` throws descriptive error when block not found
- [ ] Both tools registered in server.ts and accessible via MCP
- [ ] Unit tests cover main paths and edge cases
- [ ] Tool descriptions follow TOOL_DESCRIPTIONS.md guidelines

## Proposed Design

### High-Level Design

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   MCP Client    │────▶│   list_blocks    │────▶│  SimApiClient   │
│   (LLM Agent)   │     │   get_block      │     │  .getWorkflow() │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Client-side      │
                        │ Block Filtering  │
                        └──────────────────┘
```

### New Files

```
src/tools/blocks/
├── list-blocks.ts        # NEW: list_blocks tool
├── get-block.ts          # NEW: get_block tool
└── index.ts              # UPDATE: add exports

tests/unit/tools/
└── blocks-query.test.ts  # NEW: tests for both tools
```

### API Interface Changes

#### `list_blocks` Tool

```typescript
// Input Schema
{
  workflowId: string;         // Required
  type?: string;              // Filter by block type (e.g., "agent", "condition")
  name?: string;              // Filter by name (case-insensitive partial match)
  ids?: string[];             // Filter by specific block IDs
  enabled?: boolean;          // Filter by enabled status
}

// Output
{
  blocks: Block[];            // Matching blocks
  total: number;              // Total blocks in workflow
  filtered: number;           // Number of blocks after filtering
}
```

#### `get_block` Tool

```typescript
// Input Schema
{
  workflowId: string;         // Required
  blockId: string;            // Required
}

// Output
{
  block: Block;               // Single block
}

// Error (block not found)
throw new Error(`Block with ID '${blockId}' not found in workflow '${workflowId}'`);
```

### Block Interface (existing, for reference)

```typescript
interface Block {
  id: string;
  type: string;
  name: string;
  positionX: number;
  positionY: number;
  enabled: boolean;
  config?: Record<string, unknown>;
  subBlocks?: SubBlock[];
  outputs?: BlockOutput[];
}
```

## Implementation Plan (Phased)

### Phase 1: Create list_blocks Tool (estimated 0.5 days)

**Commits in this phase: 2**

#### Commit 1: Add list_blocks tool implementation

- **Steps**:
  1. Create `src/tools/blocks/list-blocks.ts`
  2. Define `LIST_BLOCKS_TOOL_NAME`, `LIST_BLOCKS_DESCRIPTION`
  3. Define `listBlocksInputSchema` with JSON Schema
  4. Define `ListBlocksInput` and `ListBlocksOutput` interfaces
  5. Implement `listBlocks(client, input)` function with filtering logic
  
- **Files**:
  - `src/tools/blocks/list-blocks.ts` (new, ~90 lines)
  
- **Implementation Details**:
  ```typescript
  export const LIST_BLOCKS_TOOL_NAME = 'list_blocks';
  
  export const LIST_BLOCKS_DESCRIPTION = 
    'List blocks from a workflow with optional filtering. Returns block metadata including id, type, name, position, and enabled status. ' +
    'Lighter-weight than get_workflow when you only need block information. Supports filtering by type, name (partial match), ' +
    'specific IDs, or enabled status.';
  
  export const listBlocksInputSchema = {
    type: 'object',
    properties: {
      workflowId: {
        type: 'string',
        description: 'ID of the workflow to list blocks from',
      },
      type: {
        type: 'string',
        description: 'Filter by block type (e.g., "agent", "condition", "api")',
      },
      name: {
        type: 'string',
        description: 'Filter by block name (case-insensitive partial match)',
      },
      ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter to only include blocks with these IDs',
      },
      enabled: {
        type: 'boolean',
        description: 'Filter by enabled status (true = enabled only, false = disabled only)',
      },
    },
    required: ['workflowId'],
  };
  ```

- **New/modified lines**: ~90
- **Tests/validation**: Manual test via MCP client
- **Value delivered**: Core block listing functionality available
- **Independently committable**: yes
- **Dependencies**: none

#### Commit 2: Export list_blocks from blocks module

- **Steps**:
  1. Update `src/tools/blocks/index.ts` to export list_blocks
  
- **Files**:
  - `src/tools/blocks/index.ts` (update, +1 line)
  
- **New/modified lines**: ~1
- **Tests/validation**: TypeScript compilation
- **Value delivered**: Tool accessible from tools module
- **Independently committable**: yes
- **Dependencies**: Commit 1

### Phase 2: Create get_block Tool (estimated 0.5 days)

**Commits in this phase: 2**

#### Commit 3: Add get_block tool implementation

- **Steps**:
  1. Create `src/tools/blocks/get-block.ts`
  2. Define constants, schema, interfaces
  3. Implement `getBlock(client, input)` function
  4. Add error handling for block not found
  
- **Files**:
  - `src/tools/blocks/get-block.ts` (new, ~70 lines)
  
- **Implementation Details**:
  ```typescript
  export const GET_BLOCK_TOOL_NAME = 'get_block';
  
  export const GET_BLOCK_DESCRIPTION = 
    'Get a single block by ID from a workflow. Returns full block details including configuration and subblocks. ' +
    'Use list_blocks first to find block IDs if needed.';
  
  export const getBlockInputSchema = {
    type: 'object',
    properties: {
      workflowId: {
        type: 'string',
        description: 'ID of the workflow containing the block',
      },
      blockId: {
        type: 'string',
        description: 'ID of the block to retrieve',
      },
    },
    required: ['workflowId', 'blockId'],
  };
  ```

- **New/modified lines**: ~70
- **Tests/validation**: Manual test via MCP client
- **Value delivered**: Single block retrieval available
- **Independently committable**: yes
- **Dependencies**: none

#### Commit 4: Export get_block from blocks module

- **Steps**:
  1. Update `src/tools/blocks/index.ts` to export get_block
  
- **Files**:
  - `src/tools/blocks/index.ts` (update, +1 line)
  
- **New/modified lines**: ~1
- **Tests/validation**: TypeScript compilation
- **Value delivered**: Tool accessible from tools module
- **Independently committable**: yes
- **Dependencies**: Commit 3

### Phase 3: Register Tools and Add Tests (estimated 1 day)

**Commits in this phase: 2**

#### Commit 5: Register tools in server.ts

- **Steps**:
  1. Import tool constants and functions from blocks module
  2. Add tool definitions to `tools` array in server.ts
  3. Add case handlers in switch statement
  
- **Files**:
  - `src/server.ts` (update, ~30 lines)
  
- **Implementation Details**:
  ```typescript
  // In tools array
  {
    name: LIST_BLOCKS_TOOL_NAME,
    description: LIST_BLOCKS_DESCRIPTION,
    inputSchema: listBlocksInputSchema,
  },
  {
    name: GET_BLOCK_TOOL_NAME,
    description: GET_BLOCK_DESCRIPTION,
    inputSchema: getBlockInputSchema,
  },
  
  // In switch statement
  case LIST_BLOCKS_TOOL_NAME: {
    const input = args as { workflowId: string; type?: string; name?: string; ids?: string[]; enabled?: boolean };
    const result = await listBlocks(apiClient, input);
    return createResponse(result);
  }
  
  case GET_BLOCK_TOOL_NAME: {
    const input = args as { workflowId: string; blockId: string };
    const result = await getBlock(apiClient, input);
    return createResponse(result);
  }
  ```

- **New/modified lines**: ~30
- **Tests/validation**: Run `npm run build`, test via MCP Inspector
- **Value delivered**: Tools fully functional via MCP
- **Independently committable**: yes
- **Dependencies**: Commits 2, 4

#### Commit 6: Add unit tests

- **Steps**:
  1. Create `tests/unit/tools/blocks-query.test.ts`
  2. Add tests for `listBlocks` with various filter combinations
  3. Add tests for `getBlock` including not-found case
  
- **Files**:
  - `tests/unit/tools/blocks-query.test.ts` (new, ~150 lines)
  
- **Test Cases**:
  ```typescript
  describe('listBlocks', () => {
    it('should return all blocks when no filters provided');
    it('should filter blocks by type');
    it('should filter blocks by name (case-insensitive)');
    it('should filter blocks by ids');
    it('should filter blocks by enabled status');
    it('should combine multiple filters');
    it('should return empty array for workflow with no blocks');
    it('should return correct total and filtered counts');
  });
  
  describe('getBlock', () => {
    it('should return block when found');
    it('should throw error when block not found');
    it('should include full block details');
  });
  ```

- **New/modified lines**: ~150
- **Tests/validation**: `npm run test`
- **Value delivered**: Regression protection, documentation via tests
- **Independently committable**: yes
- **Dependencies**: Commits 2, 4

## Summary

- **Total commits**: 6
- **Total new code**: ~340 lines
- **Total removed**: 0 lines
- **Net change**: +340 lines
- **Total estimated time**: 2 days

### Benefits Achieved

- [ ] Lightweight block access without full workflow export
- [ ] Flexible filtering by type, name, IDs, and enabled status
- [ ] Consistent with existing tool patterns
- [ ] Better LLM efficiency (less token consumption for block queries)

### Backward Compatibility

- [x] No changes to existing tools
- [x] No changes to API client methods
- [x] No backend changes required
- [x] Existing tests unaffected

## Progress Tracking

- [ ] Phase 1 (0/2 commits)
  - [ ] Commit 1: list_blocks implementation
  - [ ] Commit 2: Export list_blocks
- [ ] Phase 2 (0/2 commits)
  - [ ] Commit 3: get_block implementation
  - [ ] Commit 4: Export get_block
- [ ] Phase 3 (0/2 commits)
  - [ ] Commit 5: Register tools in server.ts
  - [ ] Commit 6: Add unit tests

## Questions/Decisions Needed

1. **Pagination for list_blocks?** - Current plan returns all blocks. Should we add `limit`/`offset` for very large workflows (>100 blocks)?
   - **Recommendation**: Skip for v1, add if needed (YAGNI)

2. **Include edges in get_block?** - Should `get_block` return edges connected to that block?
   - **Recommendation**: No, use `get_workflow` for edge info (KISS)

3. **Summary mode for list_blocks?** - Option to return only id/type/name without full block details?
   - **Recommendation**: Skip for v1, blocks are already reasonably sized

## Testing Strategy

### Unit Tests

- Mock `SimApiClient.getWorkflow()` to return controlled block data
- Test each filter type independently
- Test filter combinations
- Test edge cases (empty blocks, block not found)
- Follow existing patterns in `tests/unit/tools/blocks.test.ts`

### Manual Testing

- Use MCP Inspector to call tools
- Test with real workflows from sim instance
- Verify response structure matches schema

## Rollout & Rollback

### Rollout Plan

1. Implement and test locally
2. PR with all commits
3. Code review
4. Merge to main
5. Deploy new sim-mcp version

### Rollback Plan

- Revert commits if issues found
- No data changes, pure additive change
- Existing tools unaffected

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance with large workflows | Low | Low | Client-side filtering is fast; add pagination later if needed |
| Name filter regex issues | Low | Medium | Use simple `includes()` rather than regex for v1 |
| Breaking existing tool imports | Low | High | Careful with index.ts exports, run full test suite |

## Alternative Approaches Considered

### Alternative 1: Create Backend Blocks Endpoint

**Approach**: Add `/api/workflows/{id}/blocks` endpoint to sim backend

**Pros**:
- True lightweight request (only blocks data transferred)
- Server-side filtering possible

**Cons**:
- Requires backend changes (out of scope)
- Platform coupling
- Deployment coordination needed

**Decision**: Rejected - client-side approach is simpler and sufficient

### Alternative 2: Enhance get_workflow with Block Filtering

**Approach**: Add optional filters to existing `get_workflow` tool

**Pros**:
- Single tool to maintain
- Backward compatible

**Cons**:
- Muddies purpose of `get_workflow`
- Still returns edges even when not needed
- Violates SRP

**Decision**: Rejected - separate tools are cleaner

### Alternative 3: Single list_blocks Tool with ID Parameter

**Approach**: Use `list_blocks(id?: string)` where single ID returns one block

**Pros**:
- One tool instead of two

**Cons**:
- Return type varies (array vs single)
- Less clear semantics
- Confusing for LLM agents

**Decision**: Rejected - separate tools are more predictable
