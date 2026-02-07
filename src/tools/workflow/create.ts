/**
 * Create Workflow Tool
 *
 * MCP tool for creating a new workflow.
 * Calls the sim backend's POST /api/workflows endpoint.
 */

import type { SimApiClient } from '../../client/index.js';
import type { Workflow } from '../../schemas/workflow.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const CREATE_WORKFLOW_TOOL_NAME = 'create_workflow';

/**
 * Tool description for MCP registration
 */
export const CREATE_WORKFLOW_DESCRIPTION =
  'Create a new workflow. Returns the created workflow with its ID. ' +
  'Use this to create an empty workflow, then add blocks and edges using other tools.';

/**
 * JSON Schema for create workflow input (for MCP registration)
 */
export const createWorkflowInputSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Display name for the workflow (required)',
    },
    workspaceId: {
      type: 'string',
      description: 'Workspace ID to create the workflow in (required)',
    },
    description: {
      type: 'string',
      description: 'Optional description of the workflow',
    },
    color: {
      type: 'string',
      description: 'Optional hex color for the workflow (default: #3972F6)',
    },
    folderId: {
      type: 'string',
      description: 'Optional folder ID to place the workflow in',
    },
    sortOrder: {
      type: 'number',
      description: 'Optional sort order for the workflow within its folder/workspace',
    },
  },
  required: ['name', 'workspaceId'],
};

/**
 * Input type for create workflow
 */
export interface CreateWorkflowInput {
  name: string;
  workspaceId: string;
  description?: string;
  color?: string;
  folderId?: string;
  sortOrder?: number;
}

/**
 * Output type for create workflow
 */
export interface CreateWorkflowOutput {
  workflow: Workflow;
}

/**
 * Create a new workflow
 *
 * @param client - SimApiClient instance
 * @param input - Workflow creation parameters
 * @returns The created workflow
 */
export async function createWorkflow(
  client: SimApiClient,
  input: CreateWorkflowInput
): Promise<CreateWorkflowOutput> {
  const logger = getLogger();

  try {
    logger.debug('Creating workflow', {
      operation: 'create_workflow',
      name: input.name,
      workspaceId: input.workspaceId,
    });

    const workflow = await client.createWorkflow({
      name: input.name,
      workspaceId: input.workspaceId,
      description: input.description,
      color: input.color,
      folderId: input.folderId,
      sortOrder: input.sortOrder,
    });

    logger.debug('Workflow created', {
      operation: 'create_workflow',
      workflowId: workflow.id,
      name: workflow.name,
    });

    return { workflow };
  } catch (error) {
    logger.error('Failed to create workflow', {
      operation: 'create_workflow',
      name: input.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
