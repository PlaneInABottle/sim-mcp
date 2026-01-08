/**
 * Variables Tools Module
 *
 * Exports all variable-related MCP tools.
 */

// Add variable tool
export {
  ADD_VARIABLE_DESCRIPTION,
  ADD_VARIABLE_TOOL_NAME,
  addVariable,
  addVariableInputSchema,
} from './add.js';
export type { AddVariableInput, AddVariableOutput } from './add.js';

// Remove variable tool
export {
  REMOVE_VARIABLE_DESCRIPTION,
  REMOVE_VARIABLE_TOOL_NAME,
  removeVariable,
  removeVariableInputSchema,
} from './remove.js';
export type { RemoveVariableInput, RemoveVariableOutput } from './remove.js';
