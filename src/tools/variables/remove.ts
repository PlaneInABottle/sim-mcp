/**
 * Remove Variable Tool
 *
 * MCP tool for removing a variable from a workflow.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { removeVariableJsonSchema } from '../../schemas/operations.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const REMOVE_VARIABLE_TOOL_NAME = 'remove_variable';

/**
 * Tool description for MCP registration
 */
export const REMOVE_VARIABLE_DESCRIPTION = 'Remove a variable from a workflow.';

/**
 * JSON Schema for MCP registration
 */
export const removeVariableInputSchema = removeVariableJsonSchema;

/**
 * Output type for remove variable
 */
export interface RemoveVariableOutput {
  success: boolean;
  operationId: string;
}

/**
 * Input type for remove variable
 */
export interface RemoveVariableInput {
  workflowId: string;
  variableId: string;
}

/**
 * Remove a variable from a workflow
 *
 * @param client - SimApiClient instance
 * @param input - Remove variable parameters
 * @returns Operation result
 */
export async function removeVariable(
  client: SimApiClient,
  input: RemoveVariableInput
): Promise<RemoveVariableOutput> {
  const logger = getLogger();

  try {
    logger.debug('Removing variable from workflow', {
      operation: 'remove_variable',
      workflowId: input.workflowId,
      variableId: input.variableId,
    });

    // Call API client
    const result: OperationResponse = await client.removeVariable(
      input.workflowId,
      input.variableId
    );

    logger.debug('Variable removed successfully', {
      operation: 'remove_variable',
      workflowId: input.workflowId,
      variableId: input.variableId,
      operationId: result.operationId,
    });

    return {
      success: result.success,
      operationId: result.operationId,
    };
  } catch (error) {
    logger.error('Failed to remove variable', {
      operation: 'remove_variable',
      workflowId: input.workflowId,
      variableId: input.variableId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
