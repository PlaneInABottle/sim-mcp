/**
 * Remove Subflow Tool
 *
 * MCP tool for removing a subflow (loop or parallel) from a workflow.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { removeSubflowJsonSchema } from '../../schemas/operations.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const REMOVE_SUBFLOW_TOOL_NAME = 'remove_subflow';

/**
 * Tool description for MCP registration
 */
export const REMOVE_SUBFLOW_DESCRIPTION =
  'Remove a subflow (loop or parallel) from a workflow.';

/**
 * JSON Schema for MCP registration
 */
export const removeSubflowInputSchema = removeSubflowJsonSchema;

/**
 * Output type for remove subflow
 */
export interface RemoveSubflowOutput {
  success: boolean;
  operationId: string;
}

/**
 * Input type for remove subflow
 */
export interface RemoveSubflowInput {
  workflowId: string;
  id: string;
}

/**
 * Remove a subflow from a workflow
 *
 * @param client - SimApiClient instance
 * @param input - Remove subflow parameters
 * @returns Operation result
 */
export async function removeSubflow(
  client: SimApiClient,
  input: RemoveSubflowInput
): Promise<RemoveSubflowOutput> {
  const logger = getLogger();

  try {
    logger.debug('Removing subflow from workflow', {
      operation: 'remove_subflow',
      workflowId: input.workflowId,
      subflowId: input.id,
    });

    // Call API client
    const result: OperationResponse = await client.subflowOperation(
      input.workflowId,
      {
        id: input.id,
      },
      'remove'
    );

    logger.debug('Subflow removed successfully', {
      operation: 'remove_subflow',
      workflowId: input.workflowId,
      subflowId: input.id,
      operationId: result.operationId,
    });

    return {
      success: result.success,
      operationId: result.operationId,
    };
  } catch (error) {
    logger.error('Failed to remove subflow', {
      operation: 'remove_subflow',
      workflowId: input.workflowId,
      subflowId: input.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
