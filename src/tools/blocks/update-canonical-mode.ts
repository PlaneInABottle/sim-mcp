/**
 * Update Block Canonical Mode Tool
 *
 * MCP tool for updating a block canonical mode entry.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { updateBlockCanonicalModeJsonSchema } from '../../schemas/operations.js';
import { checkBroadcastFailure } from '../../utils/broadcast-warning.js';
import { getLogger } from '../../utils/logger.js';
import { validateRequiredParams } from '../workflow/shared.js';

/**
 * Tool name constant
 */
export const UPDATE_BLOCK_CANONICAL_MODE_TOOL_NAME = 'update_block_canonical_mode';

/**
 * Tool description for MCP registration
 */
export const UPDATE_BLOCK_CANONICAL_MODE_DESCRIPTION = 'Update a block canonical mode entry.';

/**
 * JSON Schema for MCP registration
 */
export const updateBlockCanonicalModeInputSchema = updateBlockCanonicalModeJsonSchema;

/**
 * Output type for update block canonical mode
 */
export interface UpdateBlockCanonicalModeOutput {
  success: boolean;
  operationId: string;
  warning?: string;
}

/**
 * Input type for update block canonical mode
 */
export interface UpdateBlockCanonicalModeInput {
  workflowId: string;
  blockId: string;
  canonicalId: string;
  canonicalMode: 'basic' | 'advanced';
}

/**
 * Update a block canonical mode entry
 *
 * @param client - SimApiClient instance
 * @param input - Update block canonical mode parameters
 * @returns Operation result
 */
export async function updateBlockCanonicalMode(
  client: SimApiClient,
  input: UpdateBlockCanonicalModeInput
): Promise<UpdateBlockCanonicalModeOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams(
      {
        workflowId: input.workflowId,
        blockId: input.blockId,
        canonicalId: input.canonicalId,
        canonicalMode: input.canonicalMode,
      },
      UPDATE_BLOCK_CANONICAL_MODE_TOOL_NAME
    );

    logger.debug('Updating block canonical mode', {
      operation: 'update_block_canonical_mode',
      workflowId: input.workflowId,
      blockId: input.blockId,
      canonicalId: input.canonicalId,
      canonicalMode: input.canonicalMode,
    });

    const result: OperationResponse = await client.updateBlockCanonicalMode(
      input.workflowId,
      input.blockId,
      input.canonicalId,
      input.canonicalMode
    );

    logger.debug('Block canonical mode updated successfully', {
      operation: 'update_block_canonical_mode',
      workflowId: input.workflowId,
      blockId: input.blockId,
      operationId: result.operationId,
    });

    const warning = checkBroadcastFailure(result, 'update_block_canonical_mode', input.workflowId);

    return {
      success: result.success,
      operationId: result.operationId,
      ...(warning && { warning }),
    };
  } catch (error) {
    logger.error('Failed to update block canonical mode', {
      operation: 'update_block_canonical_mode',
      workflowId: input.workflowId,
      blockId: input.blockId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
