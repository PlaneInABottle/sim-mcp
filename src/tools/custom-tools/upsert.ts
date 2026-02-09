/**
 * Upsert Custom Tools Tool
 *
 * MCP tool for creating or updating custom tools in a workspace.
 * Supports batch upsert of multiple tools.
 *
 * The backend API returns ALL tools in the workspace after upsert.
 * This module applies client-side filtering to return ONLY the
 * tools that were actually upserted (created or updated).
 */

import type { SimApiClient } from '../../client/index.js';
import type { CustomTool, CustomToolInput } from '../../schemas/custom-tools.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const UPSERT_CUSTOM_TOOLS_TOOL_NAME = 'upsert_custom_tools';

/**
 * Tool description for MCP registration
 */
export const UPSERT_CUSTOM_TOOLS_DESCRIPTION =
  'Create or update custom tools in a workspace. Supports batch operations. If a tool has an id, it will be updated; otherwise, a new tool will be created. Each tool requires title, schema (with function definition), and code. Returns only the created/updated tools, not all tools in the workspace.';

/**
 * JSON Schema for upsert custom tools input (for MCP registration)
 */
export const upsertCustomToolsInputSchema = {
  type: 'object',
  properties: {
    workspaceId: {
      type: 'string',
      description: 'Workspace ID to create/update tools in',
    },
    tools: {
      type: 'array',
      description: 'Array of tools to create or update',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Optional tool ID. If provided, the tool will be updated.',
          },
          title: {
            type: 'string',
            description: 'Display title for the tool',
          },
          schema: {
            type: 'object',
            description: 'Tool schema with function definition',
            properties: {
              type: {
                type: 'string',
                enum: ['function'],
                description: 'Schema type, must be "function"',
              },
              function: {
                type: 'object',
                description: 'Function definition',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Function name',
                  },
                  description: {
                    type: 'string',
                    description: 'Function description',
                  },
                  parameters: {
                    type: 'object',
                    description: 'JSON Schema for function parameters',
                  },
                },
                required: ['name', 'parameters'],
              },
            },
            required: ['type', 'function'],
          },
          code: {
            type: 'string',
            description: 'JavaScript code for the tool implementation',
          },
        },
        required: ['title', 'schema', 'code'],
      },
    },
  },
  required: ['workspaceId', 'tools'],
};

/**
 * Output type for upsert custom tools.
 * Contains only the tools that were actually upserted (created or updated),
 * not all tools in the workspace.
 */
export interface UpsertCustomToolsOutput {
  success: boolean;
  tools: CustomTool[];
}

/**
 * Input type for upsert custom tools
 */
export interface UpsertCustomToolsInput {
  workspaceId: string;
  tools: CustomToolInput[];
}

/**
 * Create or update custom tools in a workspace.
 *
 * The backend API returns ALL tools in the workspace after upsert.
 * This function filters the response to return ONLY the upserted tools:
 * - **Updates** (input has `id`): matched by ID in the response
 * - **Creates** (input has no `id`): matched by `schema.function.name` in the response
 *
 * @param client - SimApiClient instance
 * @param input - Upsert custom tools parameters
 * @returns Only the tools that were created or updated
 */
export async function upsertCustomTools(
  client: SimApiClient,
  input: UpsertCustomToolsInput
): Promise<UpsertCustomToolsOutput> {
  const logger = getLogger();

  try {
    logger.debug('Upserting custom tools', {
      operation: 'upsert_custom_tools',
      workspaceId: input.workspaceId,
      toolCount: input.tools.length,
    });

    // Call API client — returns ALL tools in the workspace
    const allTools = await client.upsertCustomTools({
      workspaceId: input.workspaceId,
      tools: input.tools,
    });

    // Filter to only the upserted tools
    const upsertedTools = filterUpsertedTools(input.tools, allTools);

    logger.debug('Custom tools upserted', {
      operation: 'upsert_custom_tools',
      workspaceId: input.workspaceId,
      upsertedCount: upsertedTools.length,
      totalInWorkspace: allTools.length,
    });

    return { success: true, tools: upsertedTools };
  } catch (error) {
    logger.error('Failed to upsert custom tools', {
      operation: 'upsert_custom_tools',
      workspaceId: input.workspaceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Filter the full workspace tool list to only tools that were upserted.
 *
 * Matching strategy:
 * - **Updates**: Input tools with an `id` are matched to response tools by that `id`.
 * - **Creates**: Input tools without an `id` are matched by `schema.function.name`,
 *   since the backend assigns a new ID on creation.
 *
 * @param inputTools - The tools sent in the upsert request
 * @param allTools - All tools returned by the API (full workspace set)
 * @returns Only the tools that correspond to the upsert input
 */
export function filterUpsertedTools(
  inputTools: CustomToolInput[],
  allTools: CustomTool[]
): CustomTool[] {
  // Collect IDs of tools being updated
  const updateIds = new Set<string>();
  // Collect function names of tools being created
  const createNames = new Set<string>();

  for (const tool of inputTools) {
    if (tool.id) {
      updateIds.add(tool.id);
    } else {
      createNames.add(tool.schema.function.name);
    }
  }

  return allTools.filter((tool) => {
    // Match updates by ID
    if (updateIds.has(tool.id)) {
      return true;
    }
    // Match creates by function name
    if (createNames.has(tool.schema.function.name)) {
      return true;
    }
    return false;
  });
}
