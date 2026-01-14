/**
 * List Blocks Tool
 *
 * MCP tool for listing blocks from a workflow with optional filtering.
 * Provides lightweight block access without downloading the entire workflow export.
 */

import type { SimApiClient } from '../../client/index.js';
import type { Block } from '../../schemas/workflow.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const LIST_BLOCKS_TOOL_NAME = 'list_blocks';

/**
 * Tool description for MCP registration
 */
export const LIST_BLOCKS_DESCRIPTION =
  'List blocks from a workflow with optional filtering. Returns block metadata including id, type, name, position, and enabled status. ' +
  'Lighter-weight than get_workflow when you only need block information. Supports filtering by type, name (partial match), ' +
  'specific IDs, or enabled status.';

/**
 * JSON Schema for list blocks input (for MCP registration)
 */
export const listBlocksInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow to list blocks from',
    },
    type: {
      type: 'string',
      description: 'Filter by block type (e.g., "agent", "condition", "api")',
    },
    name: {
      type: 'string',
      description: 'Filter by block name (case-insensitive partial match)',
    },
    ids: {
      type: 'array',
      items: { type: 'string' },
      description: 'Filter to only include blocks with these IDs',
    },
    enabled: {
      type: 'boolean',
      description: 'Filter by enabled status (true = enabled only, false = disabled only)',
    },
    verbose: {
      type: 'boolean',
      description:
        'If true, returns full block details including config, subBlocks, and outputs. If false (default), returns only summary fields (id, type, name, position, enabled)',
    },
  },
  required: ['workflowId'],
};

/**
 * Input type for list blocks
 */
export interface ListBlocksInput {
  workflowId: string;
  type?: string;
  name?: string;
  ids?: string[];
  enabled?: boolean;
  verbose?: boolean;
}

/**
 * Summary type for block - lightweight representation with essential fields only
 */
export interface BlockSummary {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  enabled: boolean;
}

/**
 * Output type for list blocks - returns summaries by default, full blocks when verbose=true
 */
export interface ListBlocksOutput<T extends BlockSummary | Block = BlockSummary> {
  blocks: T[];
  total: number;
  filtered: number;
}

/**
 * Transforms a full Block to a lightweight BlockSummary
 */
function toBlockSummary(block: Block): BlockSummary {
  return {
    id: block.id,
    type: block.type,
    name: block.name,
    position: { x: block.positionX, y: block.positionY },
    enabled: block.enabled,
  };
}

/**
 * List blocks from a workflow with optional filtering
 *
 * @param client - SimApiClient instance
 * @param input - List blocks parameters with optional filters
 * @returns Filtered blocks with total and filtered counts. Returns summaries by default, full blocks when verbose=true
 */
export async function listBlocks(
  client: SimApiClient,
  input: ListBlocksInput
): Promise<ListBlocksOutput<BlockSummary> | ListBlocksOutput<Block>> {
  const logger = getLogger();

  try {
    logger.debug('Listing blocks from workflow', {
      operation: 'list_blocks',
      workflowId: input.workflowId,
      filters: {
        type: input.type,
        name: input.name,
        ids: input.ids,
        enabled: input.enabled,
        verbose: input.verbose,
      },
    });

    // Get workflow with blocks
    const workflow = await client.getWorkflow(input.workflowId);
    const allBlocks = workflow.blocks ?? [];
    const total = allBlocks.length;

    // Apply filters
    let filteredBlocks = allBlocks;

    // Filter by type
    if (input.type !== undefined) {
      const filterType = input.type.toLowerCase();
      filteredBlocks = filteredBlocks.filter((block) => block.type.toLowerCase() === filterType);
    }

    // Filter by name (case-insensitive partial match)
    if (input.name !== undefined) {
      const searchName = input.name.toLowerCase();
      filteredBlocks = filteredBlocks.filter((block) =>
        block.name.toLowerCase().includes(searchName)
      );
    }

    // Filter by specific IDs
    if (input.ids !== undefined && input.ids.length > 0) {
      const idSet = new Set(input.ids);
      filteredBlocks = filteredBlocks.filter((block) => idSet.has(block.id));
    }

    // Filter by enabled status
    if (input.enabled !== undefined) {
      filteredBlocks = filteredBlocks.filter((block) => block.enabled === input.enabled);
    }

    logger.debug('Blocks listed successfully', {
      operation: 'list_blocks',
      workflowId: input.workflowId,
      total,
      filtered: filteredBlocks.length,
      verbose: input.verbose ?? false,
    });

    // Return full blocks when verbose=true, otherwise return summaries
    if (input.verbose === true) {
      return {
        blocks: filteredBlocks,
        total,
        filtered: filteredBlocks.length,
      };
    }

    return {
      blocks: filteredBlocks.map(toBlockSummary),
      total,
      filtered: filteredBlocks.length,
    };
  } catch (error) {
    logger.error('Failed to list blocks', {
      operation: 'list_blocks',
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
