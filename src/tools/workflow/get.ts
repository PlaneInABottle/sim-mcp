/**
 * Get Workflow Tool
 *
 * MCP tool for retrieving a single workflow with full details.
 * Returns workflow including blocks and edges.
 */

import type { SimApiClient } from '../../client/index.js';
import type { WorkflowWithBlocks } from '../../schemas/workflow.js';
import { getLogger } from '../../utils/logger.js';
import { validateRequiredParams } from './shared.js';

/**
 * Tool name constant
 */
export const GET_WORKFLOW_TOOL_NAME = 'get_workflow';

/**
 * Tool description for MCP registration
 */
export const GET_WORKFLOW_DESCRIPTION =
  'Get a single workflow with blocks and edges. By default returns lightweight block metadata (no config/subBlocks/data). ' +
  'Warning: verbose=true can produce very large responses for workflows with many blocks. ' +
  'Prefer verbose=false (default) and use get_block for targeted block configuration details. ' +
  'For examining specific block configurations, use get_block tool instead.';

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
        'If true, include full block configuration (config/subBlocks/data). Warning: verbose=true can produce very large responses; prefer verbose=false (default) and use get_block for targeted inspection.',
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
 * Create a lightweight workflow view by stripping block config/subBlocks/data.
 */
type WorkflowBlock = NonNullable<WorkflowWithBlocks['blocks']>[number];
type WorkflowBlockWithData = WorkflowBlock & { data?: Record<string, unknown> };
type LightweightWorkflowBlock = Pick<
  WorkflowBlockWithData,
  'id' | 'type' | 'name' | 'positionX' | 'positionY' | 'enabled' | 'outputs'
>;

function stripBlockDetails(block: WorkflowBlockWithData): LightweightWorkflowBlock {
  const { id, type, name, positionX, positionY, enabled, outputs } = block;

  return {
    id,
    type,
    name,
    positionX,
    positionY,
    enabled: enabled ?? true,
    ...(outputs ? { outputs } : {}),
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
    validateRequiredParams({ workflowId: input.workflowId }, GET_WORKFLOW_TOOL_NAME);

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
