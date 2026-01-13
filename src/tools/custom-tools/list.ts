/**
 * List Custom Tools Tool
 *
 * MCP tool for listing custom tools in a workspace.
 * Supports filtering by workspace ID or workflow ID.
 */

import type { SimApiClient } from '../../client/index.js';
import type { CustomTool } from '../../schemas/custom-tools.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const LIST_CUSTOM_TOOLS_TOOL_NAME = 'list_custom_tools';

/**
 * Tool description for MCP registration
 */
export const LIST_CUSTOM_TOOLS_DESCRIPTION =
  'List all custom tools in a workspace. Returns tools with their id, title, schema, and code. Requires workspaceId or workflowId parameter.';

/**
 * JSON Schema for list custom tools input (for MCP registration)
 */
export const listCustomToolsInputSchema = {
  type: 'object',
  properties: {
    workspaceId: {
      type: 'string',
      description: 'Workspace ID to fetch custom tools for',
    },
    workflowId: {
      type: 'string',
      description:
        'Optional workflow ID to resolve workspace. If provided without workspaceId, the workspace will be resolved from the workflow.',
    },
  },
  required: [],
};

/**
 * Output type for list custom tools
 */
export interface ListCustomToolsOutput {
  tools: CustomTool[];
}

/**
 * Input type for list custom tools
 */
export interface ListCustomToolsInput {
  workspaceId?: string;
  workflowId?: string;
}

/**
 * List custom tools for a workspace
 *
 * @param client - SimApiClient instance
 * @param input - List custom tools parameters
 * @returns List of custom tools
 */
export async function listCustomTools(
  client: SimApiClient,
  input: ListCustomToolsInput
): Promise<ListCustomToolsOutput> {
  const logger = getLogger();

  try {
    logger.debug('Listing custom tools', {
      operation: 'list_custom_tools',
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
    });

    // Call API client
    const tools = await client.listCustomTools({
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
    });

    logger.debug('Custom tools retrieved', {
      operation: 'list_custom_tools',
      count: tools.length,
    });

    return { tools };
  } catch (error) {
    logger.error('Failed to list custom tools', {
      operation: 'list_custom_tools',
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
