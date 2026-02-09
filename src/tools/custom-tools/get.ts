/**
 * Get Custom Tool Tool
 *
 * MCP tool for retrieving a single custom tool by ID.
 * Returns full tool details including schema and code.
 * Follows the get_block pattern: calls list API, finds by ID.
 */

import type { SimApiClient } from '../../client/index.js';
import type { CustomTool } from '../../schemas/custom-tools.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const GET_CUSTOM_TOOL_TOOL_NAME = 'get_custom_tool';

/**
 * Tool description for MCP registration
 */
export const GET_CUSTOM_TOOL_DESCRIPTION =
  'Get full details for a specific custom tool by ID. Returns the complete tool including schema ' +
  '(function definition with parameters) and code. Use list_custom_tools first to find tool IDs, ' +
  'then use this tool for detailed inspection.';

/**
 * JSON Schema for get custom tool input (for MCP registration)
 */
export const getCustomToolInputSchema = {
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
    toolId: {
      type: 'string',
      description: 'The unique identifier of the custom tool to retrieve',
    },
  },
  required: ['toolId'],
};

/**
 * Input type for get custom tool
 */
export interface GetCustomToolInput {
  workspaceId?: string;
  workflowId?: string;
  toolId: string;
}

/**
 * Output type for get custom tool
 */
export interface GetCustomToolOutput {
  tool: CustomTool;
}

/**
 * Get a single custom tool by ID
 *
 * Calls the list API and filters client-side (same pattern as get_block).
 *
 * @param client - SimApiClient instance
 * @param input - Workspace/workflow ID and tool ID
 * @returns Full custom tool details
 * @throws Error if tool is not found
 */
export async function getCustomTool(
  client: SimApiClient,
  input: GetCustomToolInput
): Promise<GetCustomToolOutput> {
  const logger = getLogger();

  try {
    logger.debug('Getting custom tool', {
      operation: 'get_custom_tool',
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
      toolId: input.toolId,
    });

    // Fetch all tools and find by ID (same pattern as get_block)
    const tools = await client.listCustomTools({
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
    });

    const tool = tools.find((t) => t.id === input.toolId);

    if (!tool) {
      throw new Error(`Custom tool with ID '${input.toolId}' not found`);
    }

    logger.debug('Custom tool retrieved successfully', {
      operation: 'get_custom_tool',
      toolId: input.toolId,
      toolTitle: tool.title,
    });

    return { tool };
  } catch (error) {
    logger.error('Failed to get custom tool', {
      operation: 'get_custom_tool',
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
      toolId: input.toolId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
