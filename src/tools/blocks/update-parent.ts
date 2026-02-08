/**
 * Update Block Parent Tool
 *
 * MCP tool for setting or removing a block's parent container
 * (for nesting inside loop/parallel blocks).
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { updateBlockParentJsonSchema } from '../../schemas/operations.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const UPDATE_BLOCK_PARENT_TOOL_NAME = 'update_block_parent';

/**
 * Tool description for MCP registration
 */
export const UPDATE_BLOCK_PARENT_DESCRIPTION =
  "Set or remove a block's parent container (for nesting inside loop/parallel blocks).";

/**
 * JSON Schema for MCP registration
 */
export const updateBlockParentInputSchema = updateBlockParentJsonSchema;

/**
 * Output type for update block parent
 */
export interface UpdateBlockParentOutput {
  success: boolean;
  operationId: string;
}

/**
 * Input type for update block parent
 */
export interface UpdateBlockParentInput {
  workflowId: string;
  blockId: string;
  parentId: string | null;
}

/**
 * Update a block's parent container
 *
 * @param client - SimApiClient instance
 * @param input - Update block parent parameters
 * @returns Operation result
 */
export async function updateBlockParent(
  client: SimApiClient,
  input: UpdateBlockParentInput
): Promise<UpdateBlockParentOutput> {
  const logger = getLogger();

  try {
    logger.debug('Updating block parent', {
      operation: 'update_block_parent',
      workflowId: input.workflowId,
      blockId: input.blockId,
      parentId: input.parentId,
    });

    // Call API client
    const result: OperationResponse = await client.updateBlockParent(
      input.workflowId,
      input.blockId,
      input.parentId
    );

    logger.debug('Block parent updated successfully', {
      operation: 'update_block_parent',
      workflowId: input.workflowId,
      blockId: input.blockId,
      operationId: result.operationId,
      parentId: input.parentId,
    });

    return {
      success: result.success,
      operationId: result.operationId,
    };
  } catch (error) {
    logger.error('Failed to update block parent', {
      operation: 'update_block_parent',
      workflowId: input.workflowId,
      blockId: input.blockId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
