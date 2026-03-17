/**
 * Update Block Advanced Mode Tool
 *
 * MCP tool for updating a block's advanced mode flag.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { updateBlockAdvancedModeJsonSchema } from '../../schemas/operations.js';
import { checkBroadcastFailure } from '../../utils/broadcast-warning.js';
import { getLogger } from '../../utils/logger.js';
import { validateRequiredParams } from '../workflow/shared.js';

/**
 * Tool name constant
 */
export const UPDATE_BLOCK_ADVANCED_MODE_TOOL_NAME = 'update_block_advanced_mode';

/**
 * Tool description for MCP registration
 */
export const UPDATE_BLOCK_ADVANCED_MODE_DESCRIPTION = "Update a block's advanced mode flag.";

/**
 * JSON Schema for MCP registration
 */
export const updateBlockAdvancedModeInputSchema = updateBlockAdvancedModeJsonSchema;

/**
 * Output type for update block advanced mode
 */
export interface UpdateBlockAdvancedModeOutput {
  success: boolean;
  operationId: string;
  warning?: string;
}

/**
 * Input type for update block advanced mode
 */
export interface UpdateBlockAdvancedModeInput {
  workflowId: string;
  blockId: string;
  advancedMode: boolean;
}

/**
 * Update a block's advanced mode flag
 *
 * @param client - SimApiClient instance
 * @param input - Update block advanced mode parameters
 * @returns Operation result
 */
export async function updateBlockAdvancedMode(
  client: SimApiClient,
  input: UpdateBlockAdvancedModeInput
): Promise<UpdateBlockAdvancedModeOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams(
      {
        workflowId: input.workflowId,
        blockId: input.blockId,
        advancedMode: input.advancedMode,
      },
      UPDATE_BLOCK_ADVANCED_MODE_TOOL_NAME
    );

    logger.debug('Updating block advanced mode', {
      operation: 'update_block_advanced_mode',
      workflowId: input.workflowId,
      blockId: input.blockId,
      advancedMode: input.advancedMode,
    });

    const result: OperationResponse = await client.updateBlockAdvancedMode(
      input.workflowId,
      input.blockId,
      input.advancedMode
    );

    logger.debug('Block advanced mode updated successfully', {
      operation: 'update_block_advanced_mode',
      workflowId: input.workflowId,
      blockId: input.blockId,
      operationId: result.operationId,
    });

    const warning = checkBroadcastFailure(result, 'update_block_advanced_mode', input.workflowId);

    return {
      success: result.success,
      operationId: result.operationId,
      ...(warning && { warning }),
    };
  } catch (error) {
    logger.error('Failed to update block advanced mode', {
      operation: 'update_block_advanced_mode',
      workflowId: input.workflowId,
      blockId: input.blockId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
