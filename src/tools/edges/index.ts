/**
 * Edge Tools Module
 *
 * Exports all edge-related MCP tools.
 */

// Add edge (operation-based)
export {
  ADD_EDGE_OP_DESCRIPTION,
  ADD_EDGE_OP_TOOL_NAME,
  addEdgeOp,
  addEdgeOpInputSchema,
} from './add-op.js';
export type { AddEdgeOpInput, AddEdgeOpOutput } from './add-op.js';

// Remove edge (operation-based)
export {
  REMOVE_EDGE_OP_DESCRIPTION,
  REMOVE_EDGE_OP_TOOL_NAME,
  removeEdgeOp,
  removeEdgeOpInputSchema,
} from './remove-op.js';
export type { RemoveEdgeOpInput, RemoveEdgeOpOutput } from './remove-op.js';
