/**
 * Update Subblock Tool
 *
 * MCP tool for updating a subblock value within a block.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { updateSubblockJsonSchema } from '../../schemas/operations.js';
import { checkBroadcastFailure } from '../../utils/broadcast-warning.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const UPDATE_SUBBLOCK_TOOL_NAME = 'update_subblock';

/**
 * Tool description for MCP registration
 */
export const UPDATE_SUBBLOCK_DESCRIPTION =
  'Update a subblock value within a block. Subblocks are configuration fields like "messages" for agent blocks, "url" for API blocks, etc. Use this to modify block-specific settings.';

/**
 * JSON Schema for MCP registration
 */
export const updateSubblockInputSchema = updateSubblockJsonSchema;

/**
 * Output type for update subblock
 */
export interface UpdateSubblockOutput {
  success: boolean;
  operationId: string;
  warning?: string;
}

/**
 * Input type for update subblock
 */
export interface UpdateSubblockInput {
  workflowId: string;
  blockId: string;
  subblockId: string;
  value: unknown;
}

/**
 * Update a subblock value within a block
 *
 * @param client - SimApiClient instance
 * @param input - Update subblock parameters
 * @returns Operation result
 */
export async function updateSubblock(
  client: SimApiClient,
  input: UpdateSubblockInput
): Promise<UpdateSubblockOutput> {
  const logger = getLogger();

  try {
    logger.debug('Updating subblock', {
      operation: 'update_subblock',
      workflowId: input.workflowId,
      blockId: input.blockId,
      subblockId: input.subblockId,
    });

    // Call API client with subblock-update operation
    const result: OperationResponse = await client.workflowOperation(
      input.workflowId,
      'subblock-update',
      'subblock',
      {
        blockId: input.blockId,
        subblockId: input.subblockId,
        value: input.value,
      }
    );

    logger.debug('Subblock updated successfully', {
      operation: 'update_subblock',
      workflowId: input.workflowId,
      blockId: input.blockId,
      subblockId: input.subblockId,
      operationId: result.operationId,
    });

    const warning = checkBroadcastFailure(result, 'update_subblock', input.workflowId);

    return {
      success: result.success,
      operationId: result.operationId,
      ...(warning && { warning }),
    };
  } catch (error) {
    logger.error('Failed to update subblock', {
      operation: 'update_subblock',
      workflowId: input.workflowId,
      blockId: input.blockId,
      subblockId: input.subblockId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
