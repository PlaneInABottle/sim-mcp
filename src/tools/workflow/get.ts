/**
 * Get Workflow Tool
 *
 * MCP tool for retrieving a single workflow with full details.
 * Returns workflow including blocks and edges.
 */

import type { SimApiClient } from '../../client/index.js';
import type { WorkflowWithBlocks } from '../../schemas/workflow.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const GET_WORKFLOW_TOOL_NAME = 'get_workflow';

/**
 * Tool description for MCP registration
 */
export const GET_WORKFLOW_DESCRIPTION =
  'Get a single workflow with blocks and edges. By default returns lightweight block metadata (no config/subBlocks). Set verbose=true to include full block configuration for deeper inspection.';

/**
 * JSON Schema for get workflow input (for MCP registration)
 */
export const getWorkflowInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The unique identifier of the workflow to retrieve',
    },
    verbose: {
      type: 'boolean',
      description:
        'If true, include full block configuration (config/subBlocks). If false (default), return lightweight block metadata.',
    },
  },
  required: ['workflowId'],
};

/**
 * Output type for get workflow
 */
export interface GetWorkflowOutput {
  workflow: WorkflowWithBlocks;
}

/**
 * Input type for get workflow
 */
export interface GetWorkflowInput {
  workflowId: string;
  verbose?: boolean;
}

/**
 * Create a lightweight workflow view by stripping block config/subBlocks.
 */
type WorkflowBlock = NonNullable<WorkflowWithBlocks['blocks']>[number];

function stripBlockDetails(block: WorkflowBlock): WorkflowBlock {
  return {
    id: block.id,
    type: block.type,
    name: block.name,
    positionX: block.positionX,
    positionY: block.positionY,
    enabled: block.enabled ?? true,
    ...(block.outputs ? { outputs: block.outputs } : {}),
  };
}

function stripWorkflowDetails(workflow: WorkflowWithBlocks): WorkflowWithBlocks {
  if (!workflow.blocks) return workflow;

  return {
    ...workflow,
    blocks: workflow.blocks.map(stripBlockDetails),
  };
}

/**
 * Get a single workflow with lightweight or full details
 *
 * @param client - SimApiClient instance
 * @param input - Workflow ID
 * @returns Workflow with blocks and edges
 */
export async function getWorkflow(
  client: SimApiClient,
  input: GetWorkflowInput
): Promise<GetWorkflowOutput> {
  const logger = getLogger();
  const verbose = input.verbose ?? false;

  try {
    logger.debug('Getting workflow', {
      operation: 'get_workflow',
      workflowId: input.workflowId,
      verbose,
    });

    // Call API client
    const workflow = await client.getWorkflow(input.workflowId);
    const result = verbose ? workflow : stripWorkflowDetails(workflow);

    logger.debug('Workflow retrieved', {
      operation: 'get_workflow',
      workflowId: workflow.id,
      verbose,
      hasBlocks: !!(result.blocks && result.blocks.length > 0),
      hasEdges: !!(result.edges && result.edges.length > 0),
    });

    return { workflow: result };
  } catch (error) {
    logger.error('Failed to get workflow', {
      operation: 'get_workflow',
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
