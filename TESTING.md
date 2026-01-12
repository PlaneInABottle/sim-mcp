# Testing Strategy

## Problem: Unit Tests vs Real API

### What Happened
Initial implementation had unit tests that passed against mocks but failed against the real backend:

1. **Subflow tools** - Had `addSubflow` and `removeSubflow` tools, but the backend only supports a single `update` operation
2. **Tests used mocks** - Unit tests passed because mocks accepted any operation
3. **No integration tests** - No tests validated against actual backend API

### Root Causes
- Schema mismatch between `sim-mcp` and `sim` backend
- Unit tests validated behavior, not API contract
- Mock client was too permissive

## Current Testing Approach

### 1. Unit Tests (`tests/unit/`)
**Purpose**: Validate tool logic and error handling
- Use mocked `SimApiClient`
- Test each tool's input/output behavior
- Test error propagation
- **Limitation**: Don't validate against real API schemas

### 2. Integration Tests (`scripts/local-e2e.ts`)
**Purpose**: Validate against real backend API
- Requires running `sim` backend on localhost:3000
- Uses real API key (stored in `.env.local`, gitignored)
- Tests all operations end-to-end
- **Run**: `npx tsx scripts/local-e2e.ts`

## Testing Workflow

### Before Committing Changes
```bash
# 1. Run unit tests
npm test

# 2. Run e2e against local backend (requires sim running)
echo "SIM_API_KEY=your-key" > .env.local
echo "TEST_WORKFLOW_ID=workflow-id" >> .env.local
npx tsx scripts/local-e2e.ts
```

### When Adding New Tools
1. **Check backend schema first** - Look at `sim/apps/sim/socket/validation/schemas.ts`
2. **Implement tool** - Match backend operation exactly
3. **Write unit tests** - Test tool logic
4. **Add to e2e** - Test against real API
5. **Update mock** - Ensure mock matches real client signature

## Schema Validation

### Backend Source of Truth
The sim backend defines operation schemas in:
- `sim/apps/sim/socket/validation/schemas.ts` - Zod schemas
- `sim/apps/sim/socket/constants.ts` - Operation types
- `sim/apps/sim/socket/database/operations.ts` - Implementation

### sim-mcp Must Match
- Tool parameters must match backend payload schemas
- Operation names must match backend constants
- Target names must match backend targets

## Preventing Future Mismatches

### 1. Schema Sync Script (TODO)
Create a script that:
- Reads backend schemas from `sim` repo
- Generates TypeScript types for `sim-mcp`
- Fails CI if schemas drift

### 2. Contract Tests (TODO)
Test against recorded API responses:
- Record real backend responses
- Replay in tests to validate client behavior
- Detects breaking changes

### 3. Integration Tests in CI (TODO)
- Spin up sim backend in Docker
- Run e2e tests against it
- Requires: Dockerized sim + test database

## Common Pitfalls

### ❌ Don't Trust Unit Tests Alone
```typescript
// This passes unit tests but fails against real API:
await client.subflowOperation(workflowId, subflow, 'add') // 'add' doesn't exist!
```

### ✅ Validate Against Backend
```typescript
// Check sim/apps/sim/socket/constants.ts:
export const SUBFLOW_OPERATIONS = {
  UPDATE: 'update', // Only operation that exists!
}
```

### ❌ Don't Assume CRUD Operations
```typescript
// Subflows don't have separate add/remove:
addSubflow()    // ❌ Doesn't exist
removeSubflow() // ❌ Doesn't exist
updateSubflow() // ✅ Only way to modify subflows
```

### ✅ Check Backend Implementation
```typescript
// Subflows are created via blocks, not separate operations:
addBlocks({ type: 'loop', ...}) // Creates subflow
updateSubflow({ id: 'loop-id', config: {...}}) // Modifies it
removeBlocks({ blockIds: ['loop-id']}) // Removes it
```

## Tool Description Guidelines

### Be Explicit About Limitations
```typescript
// ❌ Misleading
"Add a subflow to a workflow"

// ✅ Clear
"Update a subflow (loop or parallel) configuration. Note: Subflows must first 
be created via add_blocks with type 'loop' or 'parallel'. This tool only 
modifies existing subflows."
```

### Document Prerequisites
```typescript
// In tool descriptions, mention:
- What needs to exist first (e.g., "block must exist")
- Related tools (e.g., "use add_blocks to create")
- Backend limitations (e.g., "only supports 'update' operation")
```

## Current Test Coverage

### ✅ Tested Operations
- Block operations: add, remove, update name, toggle enabled, update subblock
- Edge operations: add, remove
- Variable operations: add, remove
- Subflow operations: update (for existing loop/parallel blocks)
- Workflow operations: list, get, export, import, delete, replace state

### 📋 TODO
- [ ] Add contract tests with recorded responses
- [ ] Schema sync script from `sim` backend
- [ ] CI integration tests with Dockerized backend
- [ ] Add validation for block types (must match registered types)
- [ ] Test error cases more thoroughly (permissions, not found, etc.)
