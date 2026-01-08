/**
 * Toggle Block Enabled Tool
 *
 * MCP tool for enabling or disabling a block in a workflow.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { toggleBlockEnabledJsonSchema } from '../../schemas/operations.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const TOGGLE_BLOCK_ENABLED_TOOL_NAME = 'toggle_block_enabled';

/**
 * Tool description for MCP registration
 */
export const TOGGLE_BLOCK_ENABLED_DESCRIPTION =
  'Enable or disable a block in a workflow. Disabled blocks are skipped during workflow execution.';

/**
 * JSON Schema for MCP registration
 */
export const toggleBlockEnabledInputSchema = toggleBlockEnabledJsonSchema;

/**
 * Output type for toggle block enabled
 */
export interface ToggleBlockEnabledOutput {
  success: boolean;
  operationId: string;
}

/**
 * Input type for toggle block enabled
 */
export interface ToggleBlockEnabledInput {
  workflowId: string;
  blockId: string;
  enabled: boolean;
}

/**
 * Toggle a block's enabled state
 *
 * @param client - SimApiClient instance
 * @param input - Toggle block enabled parameters
 * @returns Operation result
 */
export async function toggleBlockEnabled(
  client: SimApiClient,
  input: ToggleBlockEnabledInput
): Promise<ToggleBlockEnabledOutput> {
  const logger = getLogger();

  try {
    logger.debug('Toggling block enabled state', {
      operation: 'toggle_block_enabled',
      workflowId: input.workflowId,
      blockId: input.blockId,
      enabled: input.enabled,
    });

    // Call API client
    const result: OperationResponse = await client.toggleBlockEnabled(
      input.workflowId,
      input.blockId,
      input.enabled
    );

    logger.debug('Block enabled state toggled successfully', {
      operation: 'toggle_block_enabled',
      workflowId: input.workflowId,
      blockId: input.blockId,
      operationId: result.operationId,
      enabled: input.enabled,
    });

    return {
      success: result.success,
      operationId: result.operationId,
    };
  } catch (error) {
    logger.error('Failed to toggle block enabled state', {
      operation: 'toggle_block_enabled',
      workflowId: input.workflowId,
      blockId: input.blockId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
