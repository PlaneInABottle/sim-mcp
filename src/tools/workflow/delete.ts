/**
 * Delete Workflow Tool
 *
 * MCP tool for permanently deleting a workflow.
 */

import type { SimApiClient } from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const DELETE_WORKFLOW_TOOL_NAME = 'delete_workflow';

/**
 * Tool description for MCP registration
 */
export const DELETE_WORKFLOW_DESCRIPTION =
  'Delete a workflow permanently. This action cannot be undone.';

/**
 * JSON Schema for delete workflow input (for MCP registration)
 */
export const deleteWorkflowInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow to delete',
    },
  },
  required: ['workflowId'],
};

/**
 * Output type for delete workflow
 */
export interface DeleteWorkflowOutput {
  success: boolean;
}

/**
 * Input type for delete workflow
 */
export interface DeleteWorkflowInput {
  workflowId: string;
}

/**
 * Delete a workflow permanently
 *
 * @param client - SimApiClient instance
 * @param input - Workflow ID to delete
 * @returns Success status
 */
export async function deleteWorkflow(
  client: SimApiClient,
  input: DeleteWorkflowInput
): Promise<DeleteWorkflowOutput> {
  const logger = getLogger();

  try {
    logger.debug('Deleting workflow', {
      operation: 'delete_workflow',
      workflowId: input.workflowId,
    });

    // Call API client
    await client.deleteWorkflow(input.workflowId);

    logger.debug('Workflow deleted', {
      operation: 'delete_workflow',
      workflowId: input.workflowId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete workflow', {
      operation: 'delete_workflow',
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
