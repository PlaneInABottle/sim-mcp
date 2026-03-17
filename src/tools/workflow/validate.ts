import type { SimApiClient } from '../../client/index.js';

import { getLogger } from '../../utils/logger.js';
import { validateRequiredParams } from './shared.js';
import { type WorkflowValidationResult, validateWorkflowDefinition } from './validation.js';

export const VALIDATE_WORKFLOW_TOOL_NAME = 'validate_workflow';

export const VALIDATE_WORKFLOW_DESCRIPTION =
  'Validate a workflow draft and return structural plus minimal handle findings for malformed state, broken edges, connectivity, reachability, unused variables, and locally provable handle issues.';

export const validateWorkflowInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID to validate',
    },
  },
  required: ['workflowId'],
};

export interface ValidateWorkflowInput {
  workflowId: string;
}

export interface ValidateWorkflowOutput {
  validation: WorkflowValidationResult;
}

export async function validateWorkflow(
  client: SimApiClient,
  input: ValidateWorkflowInput
): Promise<ValidateWorkflowOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams({ workflowId: input.workflowId }, VALIDATE_WORKFLOW_TOOL_NAME);

    logger.debug('Validating workflow', {
      operation: VALIDATE_WORKFLOW_TOOL_NAME,
      workflowId: input.workflowId,
    });

    const workflow = await client.getWorkflowStateForValidation(input.workflowId);
    return { validation: validateWorkflowDefinition(workflow) };
  } catch (error) {
    logger.error('Failed to validate workflow', {
      operation: VALIDATE_WORKFLOW_TOOL_NAME,
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
