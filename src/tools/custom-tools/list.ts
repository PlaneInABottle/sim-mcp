/**
 * List Custom Tools Tool
 *
 * MCP tool for listing custom tools in a workspace.
 * Returns lightweight metadata only (id, title, name, description)
 * without full schema or code. Use get_custom_tool for full details.
 */

import type { SimApiClient } from '../../client/index.js';
import type { CustomTool } from '../../schemas/custom-tools.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Lightweight summary of a custom tool, stripped of heavy fields (schema, code).
 * Use get_custom_tool to retrieve full details for a specific tool.
 */
export interface CustomToolSummary {
  id: string;
  title: string;
  name: string;
  description?: string;
}

/**
 * Strip heavy fields from a CustomTool, keeping only lightweight metadata.
 * Follows the same pattern as stripBlockDetails in src/tools/workflow/get.ts.
 *
 * Keeps: id, title, name (from schema.function.name), description (from schema.function.description)
 * Strips: schema (full object), code, workspaceId, userId, createdAt, updatedAt
 */
export function stripCustomToolDetails(tool: CustomTool): CustomToolSummary {
  const { id, title } = tool;
  const name = tool.schema.function.name;
  const description = tool.schema.function.description;
  return { id, title, name, ...(description ? { description } : {}) };
}

/**
 * Tool name constant
 */
export const LIST_CUSTOM_TOOLS_TOOL_NAME = 'list_custom_tools';

/**
 * Tool description for MCP registration
 */
export const LIST_CUSTOM_TOOLS_DESCRIPTION =
  'List all custom tools in a workspace. Returns lightweight metadata only (id, title, name, description) ' +
  'without full schema or code. Use get_custom_tool to retrieve full details for a specific tool. ' +
  'Requires workspaceId or workflowId parameter.';

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
 * Output type for list custom tools (lightweight summaries)
 */
export interface ListCustomToolsOutput {
  tools: CustomToolSummary[];
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
 * Returns lightweight metadata only. Use get_custom_tool for full details.
 *
 * @param client - SimApiClient instance
 * @param input - List custom tools parameters
 * @returns List of custom tool summaries (id, title, name, description)
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

    return { tools: tools.map(stripCustomToolDetails) };
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
