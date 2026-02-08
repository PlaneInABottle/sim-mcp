/**
 * Update Block Name Tool
 *
 * MCP tool for updating a block's display name.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { updateBlockNameJsonSchema } from '../../schemas/operations.js';
import { checkBroadcastFailure } from '../../utils/broadcast-warning.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const UPDATE_BLOCK_NAME_TOOL_NAME = 'update_block_name';

/**
 * Tool description for MCP registration
 */
export const UPDATE_BLOCK_NAME_DESCRIPTION = 'Update the display name of a block in a workflow.';

/**
 * JSON Schema for MCP registration
 */
export const updateBlockNameInputSchema = updateBlockNameJsonSchema;

/**
 * Output type for update block name
 */
export interface UpdateBlockNameOutput {
  success: boolean;
  operationId: string;
  warning?: string;
}

/**
 * Input type for update block name
 */
export interface UpdateBlockNameInput {
  workflowId: string;
  blockId: string;
  name: string;
}

/**
 * Update a block's display name
 *
 * @param client - SimApiClient instance
 * @param input - Update block name parameters
 * @returns Operation result
 */
export async function updateBlockName(
  client: SimApiClient,
  input: UpdateBlockNameInput
): Promise<UpdateBlockNameOutput> {
  const logger = getLogger();

  try {
    logger.debug('Updating block name', {
      operation: 'update_block_name',
      workflowId: input.workflowId,
      blockId: input.blockId,
      newName: input.name,
    });

    // Call API client
    const result: OperationResponse = await client.updateBlockName(
      input.workflowId,
      input.blockId,
      input.name
    );

    logger.debug('Block name updated successfully', {
      operation: 'update_block_name',
      workflowId: input.workflowId,
      blockId: input.blockId,
      operationId: result.operationId,
    });

    const warning = checkBroadcastFailure(result, 'update_block_name', input.workflowId);

    return {
      success: result.success,
      operationId: result.operationId,
      ...(warning && { warning }),
    };
  } catch (error) {
    logger.error('Failed to update block name', {
      operation: 'update_block_name',
      workflowId: input.workflowId,
      blockId: input.blockId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
