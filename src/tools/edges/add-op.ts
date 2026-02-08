/**
 * Add Edge (Operation-Based) Tool
 *
 * MCP tool for adding an edge between blocks using the operations endpoint.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { addEdgeOpJsonSchema } from '../../schemas/operations.js';
import { checkBroadcastFailure } from '../../utils/broadcast-warning.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const ADD_EDGE_OP_TOOL_NAME = 'add_edge';

/**
 * Tool description for MCP registration
 */
export const ADD_EDGE_OP_DESCRIPTION =
  'Add a new edge to connect two blocks in a workflow. Edges define the execution flow and data passing between blocks. Both source and target blocks must exist in the workflow.';

/**
 * JSON Schema for MCP registration
 */
export const addEdgeOpInputSchema = addEdgeOpJsonSchema;

/**
 * Output type for add edge
 */
export interface AddEdgeOpOutput {
  success: boolean;
  operationId: string;
  edgeId: string;
  warning?: string;
}

/**
 * Input type for add edge
 */
export interface AddEdgeOpInput {
  workflowId: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  edgeId?: string;
}

/**
 * Generate a unique edge ID
 */
function generateEdgeId(): string {
  return `e-${crypto.randomUUID()}`;
}

/**
 * Add an edge to connect two blocks in a workflow
 *
 * @param client - SimApiClient instance
 * @param input - Edge data to add
 * @returns Operation result
 */
export async function addEdgeOp(
  client: SimApiClient,
  input: AddEdgeOpInput
): Promise<AddEdgeOpOutput> {
  const logger = getLogger();

  try {
    const edgeId = input.edgeId ?? generateEdgeId();

    logger.debug('Adding edge to workflow', {
      operation: 'add_edge',
      workflowId: input.workflowId,
      source: input.source,
      target: input.target,
      edgeId,
    });

    // Call API client
    const result: OperationResponse = await client.addEdgeOperation(input.workflowId, {
      id: edgeId,
      source: input.source,
      target: input.target,
      sourceHandle: input.sourceHandle ?? null,
      targetHandle: input.targetHandle ?? null,
    });

    logger.debug('Edge added successfully', {
      operation: 'add_edge',
      workflowId: input.workflowId,
      edgeId,
      operationId: result.operationId,
    });

    const warning = checkBroadcastFailure(result, 'add_edge', input.workflowId);

    return {
      success: result.success,
      operationId: result.operationId,
      edgeId,
      ...(warning && { warning }),
    };
  } catch (error) {
    logger.error('Failed to add edge', {
      operation: 'add_edge',
      workflowId: input.workflowId,
      source: input.source,
      target: input.target,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
