/**
 * Workflow Tools Module
 *
 * Exports all workflow-related MCP tools.
 */

// List workflows tool
export {
  LIST_WORKFLOWS_DESCRIPTION,
  LIST_WORKFLOWS_TOOL_NAME,
  listWorkflows,
  listWorkflowsInputSchema,
} from './list.js';
export type { ListWorkflowsInput, ListWorkflowsOutput } from './list.js';

// Get workflow tool
export {
  GET_WORKFLOW_DESCRIPTION,
  GET_WORKFLOW_TOOL_NAME,
  getWorkflow,
  getWorkflowInputSchema,
} from './get.js';
export type { GetWorkflowInput, GetWorkflowOutput } from './get.js';

// Replace workflow state tool
export {
  REPLACE_WORKFLOW_STATE_DESCRIPTION,
  REPLACE_WORKFLOW_STATE_TOOL_NAME,
  replaceWorkflowState,
  replaceWorkflowStateInputSchema,
} from './replace-state.js';
export type { ReplaceWorkflowStateInput, ReplaceWorkflowStateOutput } from './replace-state.js';

// Execute workflow tool
export {
  EXECUTE_WORKFLOW_DESCRIPTION,
  EXECUTE_WORKFLOW_TOOL_NAME,
  executeWorkflow,
  executeWorkflowInputSchema,
} from './execute.js';
export type { ExecuteWorkflowInput, ExecuteWorkflowOutput } from './execute.js';

// Execution logs tools
export {
  GET_EXECUTION_LOGS_DESCRIPTION,
  GET_EXECUTION_LOGS_TOOL_NAME,
  getExecutionLogs,
  getExecutionLogsInputSchema,
  GET_EXECUTION_LOG_DETAIL_DESCRIPTION,
  GET_EXECUTION_LOG_DETAIL_TOOL_NAME,
  getExecutionLogDetail,
  getExecutionLogDetailInputSchema,
} from './get-logs.js';
export type {
  GetExecutionLogsInput,
  GetExecutionLogsOutput,
  GetExecutionLogDetailInput,
  GetExecutionLogDetailOutput,
} from './get-logs.js';
