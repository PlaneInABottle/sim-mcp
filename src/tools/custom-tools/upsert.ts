/**
 * Upsert Custom Tools Tool
 *
 * MCP tool for creating or updating custom tools in a workspace.
 * Supports batch upsert of multiple tools.
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
  'Create or update custom tools in a workspace. Supports batch operations. If a tool has an id, it will be updated; otherwise, a new tool will be created. Each tool requires title, schema (with function definition), and code.';

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
 * Output type for upsert custom tools
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
 * Create or update custom tools in a workspace
 *
 * @param client - SimApiClient instance
 * @param input - Upsert custom tools parameters
 * @returns Updated list of tools in the workspace
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

    // Call API client
    const tools = await client.upsertCustomTools({
      workspaceId: input.workspaceId,
      tools: input.tools,
    });

    logger.debug('Custom tools upserted', {
      operation: 'upsert_custom_tools',
      workspaceId: input.workspaceId,
      resultCount: tools.length,
    });

    return { success: true, tools };
  } catch (error) {
    logger.error('Failed to upsert custom tools', {
      operation: 'upsert_custom_tools',
      workspaceId: input.workspaceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
