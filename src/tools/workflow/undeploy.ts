import type { SimApiClient, WorkflowDeploymentResult } from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';
import { mapAuthModeError, validateRequiredParams } from './shared.js';

export const UNDEPLOY_WORKFLOW_TOOL_NAME = 'undeploy_workflow';

export const UNDEPLOY_WORKFLOW_DESCRIPTION =
  'Undeploy a workflow and remove its active deployment snapshot.';

export const undeployWorkflowInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID to undeploy',
    },
  },
  required: ['workflowId'],
};

export interface UndeployWorkflowInput {
  workflowId: string;
}

export interface UndeployWorkflowOutput extends WorkflowDeploymentResult {}

export async function undeployWorkflow(
  client: SimApiClient,
  input: UndeployWorkflowInput
): Promise<UndeployWorkflowOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams({ workflowId: input.workflowId }, UNDEPLOY_WORKFLOW_TOOL_NAME);

    logger.debug('Undeploying workflow', {
      operation: UNDEPLOY_WORKFLOW_TOOL_NAME,
      workflowId: input.workflowId,
    });

    return await client.undeployWorkflow(input.workflowId);
  } catch (error) {
    const mappedError = mapAuthModeError(error, UNDEPLOY_WORKFLOW_TOOL_NAME);
    logger.error('Failed to undeploy workflow', {
      operation: UNDEPLOY_WORKFLOW_TOOL_NAME,
      workflowId: input.workflowId,
      error: mappedError instanceof Error ? mappedError.message : 'Unknown error',
    });
    throw mappedError;
  }
}
