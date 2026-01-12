/**
 * Replace Workflow State Tool
 *
 * MCP tool for replacing the entire workflow state.
 * Useful for bulk updates or restoring from backup.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { replaceWorkflowStateJsonSchema } from '../../schemas/operations.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const REPLACE_WORKFLOW_STATE_TOOL_NAME = 'replace_workflow_state';

/**
 * Tool description for MCP registration
 */
export const REPLACE_WORKFLOW_STATE_DESCRIPTION =
  'Replace the entire workflow state (blocks, edges, variables, subflows). This overwrites all existing workflow content. Use with caution - typically used after export_workflow or for applying major structural changes.';

/**
 * JSON Schema for MCP registration
 */
export const replaceWorkflowStateInputSchema = replaceWorkflowStateJsonSchema;

/**
 * Output type for replace workflow state
 */
export interface ReplaceWorkflowStateOutput {
  success: boolean;
  operationId: string;
}

/**
 * Input type for replace workflow state
 */
export interface ReplaceWorkflowStateInput {
  workflowId: string;
  state: Record<string, unknown>;
}

/**
 * Replace the entire workflow state
 *
 * @param client - SimApiClient instance
 * @param input - Replace workflow state parameters
 * @returns Operation result
 */
export async function replaceWorkflowState(
  client: SimApiClient,
  input: ReplaceWorkflowStateInput
): Promise<ReplaceWorkflowStateOutput> {
  const logger = getLogger();

  try {
    logger.debug('Replacing workflow state', {
      operation: 'replace_workflow_state',
      workflowId: input.workflowId,
      hasBlocks: !!(input.state.blocks && Object.keys(input.state.blocks as object).length > 0),
      hasEdges: !!(input.state.edges && (input.state.edges as unknown[]).length > 0),
    });

    // Call API client
    const result: OperationResponse = await client.replaceWorkflowState(
      input.workflowId,
      input.state
    );

    logger.debug('Workflow state replaced successfully', {
      operation: 'replace_workflow_state',
      workflowId: input.workflowId,
      operationId: result.operationId,
    });

    return {
      success: result.success,
      operationId: result.operationId,
    };
  } catch (error) {
    logger.error('Failed to replace workflow state', {
      operation: 'replace_workflow_state',
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
