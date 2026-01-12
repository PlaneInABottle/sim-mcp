/**
 * Get Workflow Tool
 *
 * MCP tool for retrieving a single workflow with full details.
 * Returns workflow including blocks and edges.
 */

import type { SimApiClient } from '../../client/index.js';
import type { WorkflowWithBlocks } from '../../schemas/workflow.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const GET_WORKFLOW_TOOL_NAME = 'get_workflow';

/**
 * Tool description for MCP registration
 */
export const GET_WORKFLOW_DESCRIPTION =
  'Get a single workflow with full details including all blocks, edges, variables, and subflows. Use this to inspect workflow structure before making modifications.';

/**
 * JSON Schema for get workflow input (for MCP registration)
 */
export const getWorkflowInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The unique identifier of the workflow to retrieve',
    },
  },
  required: ['workflowId'],
};

/**
 * Output type for get workflow
 */
export interface GetWorkflowOutput {
  workflow: WorkflowWithBlocks;
}

/**
 * Input type for get workflow
 */
export interface GetWorkflowInput {
  workflowId: string;
}

/**
 * Get a single workflow with full details
 *
 * @param client - SimApiClient instance
 * @param input - Workflow ID
 * @returns Workflow with blocks and edges
 */
export async function getWorkflow(
  client: SimApiClient,
  input: GetWorkflowInput
): Promise<GetWorkflowOutput> {
  const logger = getLogger();

  try {
    logger.debug('Getting workflow', {
      operation: 'get_workflow',
      workflowId: input.workflowId,
    });

    // Call API client
    const workflow = await client.getWorkflow(input.workflowId);

    logger.debug('Workflow retrieved', {
      operation: 'get_workflow',
      workflowId: workflow.id,
      hasBlocks: !!(workflow.blocks && workflow.blocks.length > 0),
      hasEdges: !!(workflow.edges && workflow.edges.length > 0),
    });

    return { workflow };
  } catch (error) {
    logger.error('Failed to get workflow', {
      operation: 'get_workflow',
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
