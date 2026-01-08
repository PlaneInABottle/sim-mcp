/**
 * Subflows Tools Module
 *
 * Exports all subflow-related MCP tools.
 */

// Add subflow tool
export {
  ADD_SUBFLOW_DESCRIPTION,
  ADD_SUBFLOW_TOOL_NAME,
  addSubflow,
  addSubflowInputSchema,
} from './add.js';
export type { AddSubflowInput, AddSubflowOutput } from './add.js';

// Update subflow tool
export {
  UPDATE_SUBFLOW_DESCRIPTION,
  UPDATE_SUBFLOW_TOOL_NAME,
  updateSubflow,
  updateSubflowInputSchema,
} from './update.js';
export type { UpdateSubflowInput, UpdateSubflowOutput } from './update.js';

// Remove subflow tool
export {
  REMOVE_SUBFLOW_DESCRIPTION,
  REMOVE_SUBFLOW_TOOL_NAME,
  removeSubflow,
  removeSubflowInputSchema,
} from './remove.js';
export type { RemoveSubflowInput, RemoveSubflowOutput } from './remove.js';
