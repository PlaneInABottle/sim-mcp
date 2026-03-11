/**
 * Remove Variable Tool
 *
 * MCP tool for removing a variable from a workflow.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { removeVariableJsonSchema } from '../../schemas/operations.js';
import { checkBroadcastFailure } from '../../utils/broadcast-warning.js';
import { getLogger } from '../../utils/logger.js';
import { validateRequiredParams } from '../workflow/shared.js';

/**
 * Tool name constant
 */
export const REMOVE_VARIABLE_TOOL_NAME = 'remove_variable';

/**
 * Tool description for MCP registration
 */
export const REMOVE_VARIABLE_DESCRIPTION =
  'Remove a workflow variable by its ID. This permanently deletes the variable and any references to it in blocks will become undefined.';

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
  warning?: string;
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
    validateRequiredParams(
      { workflowId: input.workflowId, variableId: input.variableId },
      REMOVE_VARIABLE_TOOL_NAME
    );

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

    const warning = checkBroadcastFailure(result, 'remove_variable', input.workflowId);

    return {
      success: result.success,
      operationId: result.operationId,
      ...(warning && { warning }),
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
