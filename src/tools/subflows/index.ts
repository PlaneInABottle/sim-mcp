/**
 * Subflows Tools Module
 *
 * Exports all subflow-related MCP tools.
 */

// Update subflow tool (handles add/update/remove via single 'update' operation)
export {
  UPDATE_SUBFLOW_DESCRIPTION,
  UPDATE_SUBFLOW_TOOL_NAME,
  updateSubflow,
  updateSubflowInputSchema,
} from './update.js';
export type { UpdateSubflowInput, UpdateSubflowOutput } from './update.js';
