import type { SimApiClient, WorkflowStatusResult } from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';
import { validateRequiredParams } from './shared.js';

export const GET_WORKFLOW_STATUS_TOOL_NAME = 'get_workflow_status';

export const GET_WORKFLOW_STATUS_DESCRIPTION =
  'Get workflow deployment status including deployed state, deployment timestamp, publication flag, and whether draft changes need redeployment.';

export const getWorkflowStatusInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID to inspect',
    },
  },
  required: ['workflowId'],
};

export interface GetWorkflowStatusInput {
  workflowId: string;
}

export interface GetWorkflowStatusOutput extends WorkflowStatusResult {}

export async function getWorkflowStatus(
  client: SimApiClient,
  input: GetWorkflowStatusInput
): Promise<GetWorkflowStatusOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams({ workflowId: input.workflowId }, GET_WORKFLOW_STATUS_TOOL_NAME);

    logger.debug('Getting workflow status', {
      operation: GET_WORKFLOW_STATUS_TOOL_NAME,
      workflowId: input.workflowId,
    });

    return await client.getWorkflowStatus(input.workflowId);
  } catch (error) {
    logger.error('Failed to get workflow status', {
      operation: GET_WORKFLOW_STATUS_TOOL_NAME,
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
