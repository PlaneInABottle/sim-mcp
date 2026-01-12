/**
 * Remove Edge (Operation-Based) Tool
 *
 * MCP tool for removing an edge using the operations endpoint.
 */

import type { SimApiClient } from '../../client/index.js';
import type { OperationResponse } from '../../client/types.js';
import { removeEdgeOpJsonSchema } from '../../schemas/operations.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const REMOVE_EDGE_OP_TOOL_NAME = 'remove_edge';

/**
 * Tool description for MCP registration
 */
export const REMOVE_EDGE_OP_DESCRIPTION =
  'Remove an edge (connection) from a workflow by its edge ID. This disconnects two blocks but does not delete the blocks themselves.';

/**
 * JSON Schema for MCP registration
 */
export const removeEdgeOpInputSchema = removeEdgeOpJsonSchema;

/**
 * Output type for remove edge
 */
export interface RemoveEdgeOpOutput {
  success: boolean;
  operationId: string;
}

/**
 * Input type for remove edge
 */
export interface RemoveEdgeOpInput {
  workflowId: string;
  edgeId: string;
}

/**
 * Remove an edge from a workflow
 *
 * @param client - SimApiClient instance
 * @param input - Remove edge parameters
 * @returns Operation result
 */
export async function removeEdgeOp(
  client: SimApiClient,
  input: RemoveEdgeOpInput
): Promise<RemoveEdgeOpOutput> {
  const logger = getLogger();

  try {
    logger.debug('Removing edge from workflow', {
      operation: 'remove_edge',
      workflowId: input.workflowId,
      edgeId: input.edgeId,
    });

    // Call API client
    const result: OperationResponse = await client.removeEdgeOperation(
      input.workflowId,
      input.edgeId
    );

    logger.debug('Edge removed successfully', {
      operation: 'remove_edge',
      workflowId: input.workflowId,
      edgeId: input.edgeId,
      operationId: result.operationId,
    });

    return {
      success: result.success,
      operationId: result.operationId,
    };
  } catch (error) {
    logger.error('Failed to remove edge', {
      operation: 'remove_edge',
      workflowId: input.workflowId,
      edgeId: input.edgeId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
