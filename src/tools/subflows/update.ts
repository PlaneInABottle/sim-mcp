/**
 * Update Subflow Tool
 *
 * MCP tool for updating a subflow (loop or parallel) configuration.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { updateSubflowJsonSchema } from '../../schemas/operations.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const UPDATE_SUBFLOW_TOOL_NAME = 'update_subflow';

/**
 * Tool description for MCP registration
 */
export const UPDATE_SUBFLOW_DESCRIPTION =
  'Update a subflow (loop or parallel) configuration in a workflow.';

/**
 * JSON Schema for MCP registration
 */
export const updateSubflowInputSchema = updateSubflowJsonSchema;

/**
 * Output type for update subflow
 */
export interface UpdateSubflowOutput {
  success: boolean;
  operationId: string;
}

/**
 * Input type for update subflow
 */
export interface UpdateSubflowInput {
  workflowId: string;
  id: string;
  type?: 'loop' | 'parallel';
  config?: Record<string, unknown>;
}

/**
 * Update a subflow in a workflow
 *
 * @param client - SimApiClient instance
 * @param input - Update subflow parameters
 * @returns Operation result
 */
export async function updateSubflow(
  client: SimApiClient,
  input: UpdateSubflowInput
): Promise<UpdateSubflowOutput> {
  const logger = getLogger();

  try {
    logger.debug('Updating subflow in workflow', {
      operation: 'update_subflow',
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
      'update'
    );

    logger.debug('Subflow updated successfully', {
      operation: 'update_subflow',
      workflowId: input.workflowId,
      subflowId: input.id,
      operationId: result.operationId,
    });

    return {
      success: result.success,
      operationId: result.operationId,
    };
  } catch (error) {
    logger.error('Failed to update subflow', {
      operation: 'update_subflow',
      workflowId: input.workflowId,
      subflowId: input.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
