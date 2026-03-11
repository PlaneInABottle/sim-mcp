import type { SimApiClient, WorkflowDeploymentResult } from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';
import { mapAuthModeError, validateRequiredParams } from './shared.js';

export const DEPLOY_WORKFLOW_TOOL_NAME = 'deploy_workflow';

export const DEPLOY_WORKFLOW_DESCRIPTION =
  'Deploy the current draft workflow state. Returns concise deployment details and any non-fatal warnings.';

export const deployWorkflowInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID to deploy',
    },
  },
  required: ['workflowId'],
};

export interface DeployWorkflowInput {
  workflowId: string;
}

export interface DeployWorkflowOutput extends WorkflowDeploymentResult {}

export async function deployWorkflow(
  client: SimApiClient,
  input: DeployWorkflowInput
): Promise<DeployWorkflowOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams({ workflowId: input.workflowId }, DEPLOY_WORKFLOW_TOOL_NAME);

    logger.debug('Deploying workflow', {
      operation: DEPLOY_WORKFLOW_TOOL_NAME,
      workflowId: input.workflowId,
    });

    return await client.deployWorkflow(input.workflowId);
  } catch (error) {
    const mappedError = mapAuthModeError(error, DEPLOY_WORKFLOW_TOOL_NAME);
    logger.error('Failed to deploy workflow', {
      operation: DEPLOY_WORKFLOW_TOOL_NAME,
      workflowId: input.workflowId,
      error: mappedError instanceof Error ? mappedError.message : 'Unknown error',
    });
    throw mappedError;
  }
}
