/**
 * Remove Blocks Tool
 *
 * MCP tool for removing one or more blocks from a workflow.
 * Uses the batch-remove-blocks operation for efficiency.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { removeBlocksJsonSchema } from '../../schemas/operations.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const REMOVE_BLOCKS_TOOL_NAME = 'remove_blocks';

/**
 * Tool description for MCP registration
 */
export const REMOVE_BLOCKS_DESCRIPTION =
  'Remove one or more blocks from a workflow. This also removes any edges connected to the removed blocks.';

/**
 * JSON Schema for MCP registration
 */
export const removeBlocksInputSchema = removeBlocksJsonSchema;

/**
 * Output type for remove blocks
 */
export interface RemoveBlocksOutput {
  success: boolean;
  operationId: string;
  blocksRemoved: number;
}

/**
 * Input type for remove blocks
 */
export interface RemoveBlocksInput {
  workflowId: string;
  blockIds: string[];
}

/**
 * Remove blocks from a workflow
 *
 * @param client - SimApiClient instance
 * @param input - Remove blocks parameters
 * @returns Operation result
 */
export async function removeBlocks(
  client: SimApiClient,
  input: RemoveBlocksInput
): Promise<RemoveBlocksOutput> {
  const logger = getLogger();

  try {
    logger.debug('Removing blocks from workflow', {
      operation: 'remove_blocks',
      workflowId: input.workflowId,
      blockCount: input.blockIds.length,
    });

    // Call API client
    const result: OperationResponse = await client.removeBlocks(input.workflowId, input.blockIds);

    logger.debug('Blocks removed successfully', {
      operation: 'remove_blocks',
      workflowId: input.workflowId,
      operationId: result.operationId,
      blocksRemoved: input.blockIds.length,
    });

    return {
      success: result.success,
      operationId: result.operationId,
      blocksRemoved: input.blockIds.length,
    };
  } catch (error) {
    logger.error('Failed to remove blocks', {
      operation: 'remove_blocks',
      workflowId: input.workflowId,
      blockCount: input.blockIds.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
