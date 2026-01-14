/**
 * Get Block Tool
 *
 * MCP tool for retrieving a single block by ID from a workflow.
 * Returns full block details including configuration and subblocks.
 */

import type { SimApiClient } from '../../client/index.js';
import type { Block } from '../../schemas/workflow.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const GET_BLOCK_TOOL_NAME = 'get_block';

/**
 * Tool description for MCP registration
 */
export const GET_BLOCK_DESCRIPTION =
  'Get a single block by ID from a workflow. Returns full block details including configuration and subblocks. ' +
  'Use list_blocks first to find block IDs if needed.';

/**
 * JSON Schema for get block input (for MCP registration)
 */
export const getBlockInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow containing the block',
    },
    blockId: {
      type: 'string',
      description: 'ID of the block to retrieve',
    },
  },
  required: ['workflowId', 'blockId'],
};

/**
 * Input type for get block
 */
export interface GetBlockInput {
  workflowId: string;
  blockId: string;
}

/**
 * Output type for get block
 */
export interface GetBlockOutput {
  block: Block;
}

/**
 * Get a single block by ID from a workflow
 *
 * @param client - SimApiClient instance
 * @param input - Workflow ID and block ID
 * @returns Single block details
 * @throws Error if block is not found
 */
export async function getBlock(
  client: SimApiClient,
  input: GetBlockInput
): Promise<GetBlockOutput> {
  const logger = getLogger();

  try {
    logger.debug('Getting block from workflow', {
      operation: 'get_block',
      workflowId: input.workflowId,
      blockId: input.blockId,
    });

    // Get workflow with blocks
    const workflow = await client.getWorkflow(input.workflowId);
    const blocks = workflow.blocks ?? [];

    // Find the block by ID
    const block = blocks.find((b) => b.id === input.blockId);

    if (!block) {
      throw new Error(
        `Block with ID '${input.blockId}' not found in workflow '${input.workflowId}'`
      );
    }

    logger.debug('Block retrieved successfully', {
      operation: 'get_block',
      workflowId: input.workflowId,
      blockId: input.blockId,
      blockType: block.type,
    });

    return { block };
  } catch (error) {
    logger.error('Failed to get block', {
      operation: 'get_block',
      workflowId: input.workflowId,
      blockId: input.blockId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
