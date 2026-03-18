/**
 * List Workflows Tool
 *
 * MCP tool for listing workflows for the authenticated user.
 * Supports pagination and workspace filtering.
 */

import type { SimApiClient } from '../../client/index.js';
import type { Workflow } from '../../schemas/workflow.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const LIST_WORKFLOWS_TOOL_NAME = 'list_workflows';

/**
 * Tool description for MCP registration
 */
export const LIST_WORKFLOWS_DESCRIPTION =
  'List workflows accessible to the authenticated user. Returns basic workflow metadata only. ' +
  'Use `get_workflow` to inspect structure, and use `verbose=true` only when you need full block configuration.';

/**
 * JSON Schema for list workflows input (for MCP registration)
 */
export const listWorkflowsInputSchema = {
  type: 'object',
  properties: {
    workspaceId: {
      type: 'string',
      description: 'Optional workspace ID to filter workflows',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of workflows to return (default: 50, max: 100)',
    },
    offset: {
      type: 'number',
      description: 'Number of workflows to skip for pagination (default: 0)',
    },
  },
  required: [],
};

/**
 * Output type for list workflows
 */
export interface ListWorkflowsOutput {
  workflows: Workflow[];
}

/**
 * Input type for list workflows
 */
export interface ListWorkflowsInput {
  workspaceId?: string;
  limit?: number;
  offset?: number;
}

/**
 * List workflows for the authenticated user
 *
 * @param client - SimApiClient instance
 * @param input - List workflows parameters
 * @returns List of workflows
 */
export async function listWorkflows(
  client: SimApiClient,
  input: ListWorkflowsInput
): Promise<ListWorkflowsOutput> {
  const logger = getLogger();

  try {
    logger.debug('Listing workflows', {
      operation: 'list_workflows',
      workspaceId: input.workspaceId,
      limit: input.limit,
      offset: input.offset,
    });

    // Call API client with defaults
    const workflows = await client.listWorkflows({
      workspaceId: input.workspaceId,
      limit: input.limit ?? 50,
      offset: input.offset ?? 0,
    });

    logger.debug('Workflows retrieved', {
      operation: 'list_workflows',
      count: workflows.length,
    });

    return { workflows };
  } catch (error) {
    logger.error('Failed to list workflows', {
      operation: 'list_workflows',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
