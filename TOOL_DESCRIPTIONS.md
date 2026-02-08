# Tool Description Improvements

## Summary of Changes

Updated all tool descriptions to be more explicit and helpful for AI agents calling the tools.

## Key Improvements

### 1. Prerequisites & Constraints
**Before**: Vague assumptions about what exists
**After**: Explicit prerequisites

Example:
- ❌ "Add a subflow to a workflow"
- ✅ "Update a subflow configuration. NOTE: Subflows must first be created via add_blocks with type 'loop' or 'parallel'"

### 2. Side Effects
**Before**: Didn't mention cascading deletions
**After**: Clear about what gets affected

Example:
- ❌ "Remove blocks from a workflow"
- ✅ "Remove blocks by their IDs. Also removes any edges connected to these blocks and their associated subflows"

### 3. Use Cases & Context
**Before**: Just described the action
**After**: Explained when/why to use it

Example:
- ❌ "List workflows for the authenticated user"
- ✅ "List all workflows accessible to the authenticated user. Returns basic metadata without block/edge details. Use get_workflow (verbose=true) to fetch full state"

### 4. Data Formats & Types
**Before**: Generic "values"
**After**: Specific types and examples

Example:
- ❌ "Add a variable to store values"
- ✅ "Add a workflow variable. Variables store values accessible via {{variableName}} syntax. Supported types: string, number, boolean, object, array, plain"

### 5. Tool Relationships
**Before**: Tools described in isolation
**After**: Cross-referenced related tools

Example:
- ❌ "Export a workflow as JSON"
- ✅ "Export a workflow as JSON. Use with import_workflow to clone or restore workflows. Exported data is portable between workspaces"

## Complete Tool Descriptions

### Block Tools

#### add_blocks
```
Add one or more blocks to a workflow. Blocks represent different actions (agent, api, condition, etc.). 
Loop and parallel blocks can be added with type "loop" or "parallel". Can optionally include edges to 
connect the new blocks.
```

#### remove_blocks
```
Remove one or more blocks from a workflow by their IDs. Also removes any edges connected to these blocks 
and their associated subflows (for loop/parallel blocks).
```

#### update_block_name
```
Update the display name of a block in a workflow.
```

#### toggle_block_enabled
```
Enable or disable a block in a workflow. Disabled blocks are skipped during workflow execution.
```

#### update_block_parent
```
Set or remove a block's parent container (for nesting inside loop/parallel blocks).
```

#### update_subblock
```
Update a subblock value within a block. Subblocks are configuration fields like "messages" for agent blocks, 
"url" for API blocks, etc. Use this to modify block-specific settings.
```

### Edge Tools

#### add_edge
```
Add a new edge to connect two blocks in a workflow. Edges define the execution flow and data passing 
between blocks. Both source and target blocks must exist in the workflow.
```

#### remove_edge
```
Remove an edge (connection) from a workflow by its edge ID. This disconnects two blocks but does not 
delete the blocks themselves.
```

### Variable Tools

#### add_variable
```
Add a new workflow variable. Variables store values accessible throughout workflow execution via 
{{variableName}} syntax. Supported types: string, number, boolean, object, array, plain.
```

#### remove_variable
```
Remove a workflow variable by its ID. This permanently deletes the variable and any references to it 
in blocks will become undefined.
```

### Subflow Tools

#### update_subflow
```
Update a subflow (loop or parallel) configuration. NOTE: Subflows must first be created via add_blocks 
with type "loop" or "parallel". This tool only modifies existing loop/parallel blocks. Use remove_blocks 
to delete them.
```

### Workflow Tools

#### list_workflows
```
List all workflows accessible to the authenticated user. Returns basic workflow metadata without 
block/edge details. Use get_workflow (verbose=true for full block config) to inspect workflow structure. 
Supports workspace filtering and pagination.
```

#### get_workflow
```
Get a single workflow with blocks and edges. By default returns lightweight block metadata (no 
config/subBlocks). Set verbose=true to include full block configuration.
```

#### import_workflow
```
Import a workflow from exported JSON data. Creates a new workflow in the specified workspace with the 
imported structure. Requires workspaceId and workflow state payload. Optionally override the workflow 
name.
```

#### delete_workflow
```
Delete a workflow permanently. This action cannot be undone. All blocks, edges, variables, and subflows 
in the workflow will be deleted.
```

#### replace_workflow_state
```
Replace the entire workflow state (blocks, edges, variables, subflows). This overwrites all existing 
workflow content. Use with caution - typically used when you already have a full workflow state payload 
or for applying major structural changes.
```

## Guidelines for Future Tool Descriptions

### Do's ✅
- **Be explicit about prerequisites** - What must exist first?
- **Mention side effects** - What else gets affected?
- **Cross-reference related tools** - How do tools work together?
- **Specify data types** - What formats are accepted?
- **Explain use cases** - When should this be used?
- **Warn about destructive operations** - Can this delete data?
- **State constraints** - What are the limitations?

### Don'ts ❌
- Don't assume implicit knowledge
- Don't use vague terms like "data" or "values" without specifics
- Don't describe tools in isolation
- Don't hide destructive behavior
- Don't omit important prerequisites
- Don't use technical jargon without explanation

## Impact on AI Agents

These improvements help AI agents:

1. **Make fewer mistakes** - Clear prerequisites prevent invalid operations
2. **Choose the right tool** - Better descriptions = better tool selection
3. **Understand consequences** - Agents know what will be affected
4. **Follow workflows** - Cross-references guide proper tool sequences
5. **Handle errors better** - Understanding constraints helps with recovery

## Testing Descriptions

When adding new tools, validate descriptions by:

1. **Ask**: Would an AI agent understand the prerequisites?
2. **Ask**: Are side effects clearly stated?
3. **Ask**: Would a human understand this without reading code?
4. **Test**: Does the e2e test exercise this tool correctly?
5. **Review**: Do related tools reference each other?
