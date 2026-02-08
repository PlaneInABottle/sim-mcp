/**
 * Add Variable Tool
 *
 * MCP tool for adding a variable to a workflow.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { addVariableJsonSchema } from '../../schemas/operations.js';
import { checkBroadcastFailure } from '../../utils/broadcast-warning.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const ADD_VARIABLE_TOOL_NAME = 'add_variable';

/**
 * Tool description for MCP registration
 */
export const ADD_VARIABLE_DESCRIPTION =
  'Add a new workflow variable. Variables store values accessible throughout workflow execution via {{variableName}} syntax. Supported types: string, number, boolean, object, array, plain.';

/**
 * JSON Schema for MCP registration
 */
export const addVariableInputSchema = addVariableJsonSchema;

/**
 * Output type for add variable
 */
export interface AddVariableOutput {
  success: boolean;
  operationId: string;
  variableId: string;
  warning?: string;
}

/**
 * Input type for add variable
 */
export interface AddVariableInput {
  workflowId: string;
  id?: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'plain';
  value: unknown;
}

/**
 * Generate a unique variable ID
 */
function generateVariableId(): string {
  return `var-${crypto.randomUUID()}`;
}

/**
 * Add a variable to a workflow
 *
 * @param client - SimApiClient instance
 * @param input - Add variable parameters
 * @returns Operation result
 */
export async function addVariable(
  client: SimApiClient,
  input: AddVariableInput
): Promise<AddVariableOutput> {
  const logger = getLogger();

  try {
    const variableId = input.id ?? generateVariableId();

    logger.debug('Adding variable to workflow', {
      operation: 'add_variable',
      workflowId: input.workflowId,
      variableId,
      name: input.name,
      type: input.type,
    });

    // Call API client
    const result: OperationResponse = await client.addVariable(input.workflowId, {
      id: variableId,
      name: input.name,
      type: input.type,
      value: input.value,
    });

    logger.debug('Variable added successfully', {
      operation: 'add_variable',
      workflowId: input.workflowId,
      variableId,
      operationId: result.operationId,
    });

    const warning = checkBroadcastFailure(result, 'add_variable', input.workflowId);

    return {
      success: result.success,
      operationId: result.operationId,
      variableId,
      ...(warning && { warning }),
    };
  } catch (error) {
    logger.error('Failed to add variable', {
      operation: 'add_variable',
      workflowId: input.workflowId,
      name: input.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
