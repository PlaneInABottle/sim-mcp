/**
 * Remove Blocks Tool
 *
 * MCP tool for removing one or more blocks from a workflow.
 * Uses the batch-remove-blocks operation for efficiency.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { removeBlocksJsonSchema } from '../../schemas/operations.js';
import { checkBroadcastFailure } from '../../utils/broadcast-warning.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const REMOVE_BLOCKS_TOOL_NAME = 'remove_blocks';

/**
 * Tool description for MCP registration
 */
export const REMOVE_BLOCKS_DESCRIPTION =
  'Remove one or more blocks from a workflow by their IDs. Also removes any edges connected to these blocks and their associated subflows (for loop/parallel blocks).';

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
  warnings?: string[];
  warning?: string;
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

    // Use accurate count from API response (falls back to request length for backwards compat)
    const blocksRemoved = result.blocksRemoved ?? input.blockIds.length;

    logger.debug('Blocks removed successfully', {
      operation: 'remove_blocks',
      workflowId: input.workflowId,
      operationId: result.operationId,
      blocksRemoved,
      ...(result.warnings?.length && { warnings: result.warnings }),
    });

    const warning = checkBroadcastFailure(result, 'remove_blocks', input.workflowId);

    return {
      success: result.success,
      operationId: result.operationId,
      blocksRemoved,
      ...(result.warnings?.length && { warnings: result.warnings }),
      ...(warning && { warning }),
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
