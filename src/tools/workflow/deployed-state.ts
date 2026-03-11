import type { DeployedWorkflowStateResult, SimApiClient } from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';
import { validateRequiredParams } from './shared.js';

export const GET_DEPLOYED_WORKFLOW_STATE_TOOL_NAME = 'get_deployed_workflow_state';

export const GET_DEPLOYED_WORKFLOW_STATE_DESCRIPTION =
  'Get the currently deployed workflow state. Returns null when no deployed snapshot exists.';

export const getDeployedWorkflowStateInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID whose deployed state should be fetched',
    },
  },
  required: ['workflowId'],
};

export interface GetDeployedWorkflowStateInput {
  workflowId: string;
}

export interface GetDeployedWorkflowStateOutput extends DeployedWorkflowStateResult {}

export async function getDeployedWorkflowState(
  client: SimApiClient,
  input: GetDeployedWorkflowStateInput
): Promise<GetDeployedWorkflowStateOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams({ workflowId: input.workflowId }, GET_DEPLOYED_WORKFLOW_STATE_TOOL_NAME);

    logger.debug('Getting deployed workflow state', {
      operation: GET_DEPLOYED_WORKFLOW_STATE_TOOL_NAME,
      workflowId: input.workflowId,
    });

    return await client.getDeployedWorkflowState(input.workflowId);
  } catch (error) {
    logger.error('Failed to get deployed workflow state', {
      operation: GET_DEPLOYED_WORKFLOW_STATE_TOOL_NAME,
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
