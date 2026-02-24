/**
 * Add Blocks Tool
 *
 * MCP tool for adding one or more blocks to a workflow.
 * Uses the batch-add-blocks operation for efficiency.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { addBlocksJsonSchema } from '../../schemas/operations.js';
import { checkBroadcastFailure } from '../../utils/broadcast-warning.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const ADD_BLOCKS_TOOL_NAME = 'add_blocks';

/**
 * Tool description for MCP registration
 */
export const ADD_BLOCKS_DESCRIPTION =
  'Add one or more blocks to a workflow. Blocks represent different actions (agent, api, condition, etc.). Loop and parallel blocks can be added with type "loop" or "parallel". Block IDs are auto-generated if not provided. Use add_edge tool to connect blocks.';

/**
 * JSON Schema for MCP registration
 */
export const addBlocksInputSchema = addBlocksJsonSchema;

/**
 * Output type for add blocks
 */
export interface AddBlocksOutput {
  success: boolean;
  operationId: string;
  blocksAdded: number;
  warning?: string;
}

/**
 * Input type for add blocks
 */
export interface AddBlocksInput {
  workflowId: string;
  blocks: Array<{
    id?: string;
    type: string;
    name: string;
    position: { x: number; y: number };
    data?: Record<string, unknown>;
    subBlocks?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    enabled?: boolean;
  }>;
  loops?: Record<string, unknown>;
  parallels?: Record<string, unknown>;
  subBlockValues?: Record<string, Record<string, unknown>>;
}

/**
 * Generate a unique block ID
 */
function generateBlockId(): string {
  return `block-${crypto.randomUUID()}`;
}

/**
 * Add blocks to a workflow
 *
 * @param client - SimApiClient instance
 * @param input - Add blocks parameters
 * @returns Operation result
 */
export async function addBlocks(
  client: SimApiClient,
  input: AddBlocksInput
): Promise<AddBlocksOutput> {
  const logger = getLogger();

  try {
    logger.debug('Adding blocks to workflow', {
      operation: 'add_blocks',
      workflowId: input.workflowId,
      blockCount: input.blocks.length,
    });

    // Ensure all blocks have IDs
    const blocksWithIds = input.blocks.map((block) => ({
      ...block,
      id: block.id ?? generateBlockId(),
    }));

    // Call API client
    const result: OperationResponse = await client.addBlocks(
      input.workflowId,
      blocksWithIds,
      undefined,
      {
        loops: input.loops,
        parallels: input.parallels,
        subBlockValues: input.subBlockValues,
      }
    );

    logger.debug('Blocks added successfully', {
      operation: 'add_blocks',
      workflowId: input.workflowId,
      operationId: result.operationId,
      blocksAdded: blocksWithIds.length,
    });

    const warning = checkBroadcastFailure(result, 'add_blocks', input.workflowId);

    return {
      success: result.success,
      operationId: result.operationId,
      blocksAdded: blocksWithIds.length,
      ...(warning && { warning }),
    };
  } catch (error) {
    logger.error('Failed to add blocks', {
      operation: 'add_blocks',
      workflowId: input.workflowId,
      blockCount: input.blocks.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
