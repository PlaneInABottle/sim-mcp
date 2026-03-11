/**
 * Execute Workflow Tool
 *
 * MCP tool for executing a workflow and returning the result.
 * Calls the sim backend's POST /api/workflows/{id}/execute endpoint.
 */

import type { SimApiClient } from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';
import { validateRequiredParams } from './shared.js';

/**
 * Tool name constant
 */
export const EXECUTE_WORKFLOW_TOOL_NAME = 'execute_workflow';

/**
 * Tool description for MCP registration
 */
export const EXECUTE_WORKFLOW_DESCRIPTION =
  'Execute a workflow and return the result. Sends input data to the workflow ' +
  'and returns the execution output. By default uses draft workflow state so deployment is not required. ' +
  'For API-triggered workflows, the input object fields are passed directly as the trigger payload.';

/**
 * JSON Schema for execute workflow input (for MCP registration)
 */
export const executeWorkflowInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The unique identifier of the workflow to execute',
    },
    input: {
      type: 'object',
      description:
        'Input data to pass to the workflow. For API-triggered workflows, these fields become the trigger payload.',
    },
    triggerType: {
      type: 'string',
      enum: ['api', 'manual', 'schedule', 'chat', 'webhook', 'mcp', 'a2a'],
      description: 'The trigger type for this execution. Defaults to "api" for API key auth.',
    },
    useDraftState: {
      type: 'boolean',
      description:
        'Use draft workflow state instead of deployed snapshot. Defaults to true, allowing execution of non-deployed workflows.',
    },
  },
  required: ['workflowId'],
};

/**
 * Input type for execute workflow
 */
export interface ExecuteWorkflowInput {
  workflowId: string;
  input?: Record<string, unknown>;
  triggerType?: string;
  useDraftState?: boolean;
}

/**
 * Output type for execute workflow
 */
export interface ExecuteWorkflowOutput {
  success: boolean;
  executionId?: string;
  output?: unknown;
  error?: string;
  metadata?: {
    duration?: number;
    startTime?: string;
    endTime?: string;
  };
}

/**
 * Execute a workflow and return the result
 *
 * @param client - SimApiClient instance
 * @param input - Execution parameters
 * @returns Execution result with output data
 */
export async function executeWorkflow(
  client: SimApiClient,
  input: ExecuteWorkflowInput
): Promise<ExecuteWorkflowOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams({ workflowId: input.workflowId }, EXECUTE_WORKFLOW_TOOL_NAME);

    logger.debug('Executing workflow', {
      operation: 'execute_workflow',
      workflowId: input.workflowId,
      hasInput: !!input.input,
      triggerType: input.triggerType,
    });

    const result = await client.executeWorkflow(input.workflowId, {
      input: input.input,
      triggerType: input.triggerType,
      useDraftState: input.useDraftState ?? true,
    });

    logger.debug('Workflow executed', {
      operation: 'execute_workflow',
      workflowId: input.workflowId,
      success: result.success,
      executionId: result.executionId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to execute workflow', {
      operation: 'execute_workflow',
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
