/**
 * Add Subflow Tool
 *
 * MCP tool for adding a subflow (loop or parallel) to a workflow.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { addSubflowJsonSchema } from '../../schemas/operations.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const ADD_SUBFLOW_TOOL_NAME = 'add_subflow';

/**
 * Tool description for MCP registration
 */
export const ADD_SUBFLOW_DESCRIPTION =
  'Add a new subflow (loop or parallel) to a workflow. Subflows allow for iteration or parallel execution of blocks.';

/**
 * JSON Schema for MCP registration
 */
export const addSubflowInputSchema = addSubflowJsonSchema;

/**
 * Output type for add subflow
 */
export interface AddSubflowOutput {
  success: boolean;
  operationId: string;
}

/**
 * Input type for add subflow
 */
export interface AddSubflowInput {
  workflowId: string;
  id: string;
  type: 'loop' | 'parallel';
  config?: Record<string, unknown>;
}

/**
 * Add a subflow to a workflow
 *
 * @param client - SimApiClient instance
 * @param input - Add subflow parameters
 * @returns Operation result
 */
export async function addSubflow(
  client: SimApiClient,
  input: AddSubflowInput
): Promise<AddSubflowOutput> {
  const logger = getLogger();

  try {
    logger.debug('Adding subflow to workflow', {
      operation: 'add_subflow',
      workflowId: input.workflowId,
      subflowId: input.id,
      type: input.type,
    });

    // Call API client
    const result: OperationResponse = await client.subflowOperation(
      input.workflowId,
      {
        id: input.id,
        type: input.type,
        config: input.config,
      },
      'add'
    );

    logger.debug('Subflow added successfully', {
      operation: 'add_subflow',
      workflowId: input.workflowId,
      subflowId: input.id,
      operationId: result.operationId,
    });

    return {
      success: result.success,
      operationId: result.operationId,
    };
  } catch (error) {
    logger.error('Failed to add subflow', {
      operation: 'add_subflow',
      workflowId: input.workflowId,
      subflowId: input.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
