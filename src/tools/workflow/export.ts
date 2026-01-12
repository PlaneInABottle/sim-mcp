/**
 * Export Workflow Tool
 *
 * MCP tool for exporting a workflow as JSON.
 * Returns the complete workflow state for backup or sharing.
 */

import type { SimApiClient } from '../../client/index.js';
import type { WorkflowExportPayload } from '../../client/types.js';
import { exportWorkflowJsonSchema } from '../../schemas/operations.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const EXPORT_WORKFLOW_TOOL_NAME = 'export_workflow';

/**
 * Tool description for MCP registration
 */
export const EXPORT_WORKFLOW_DESCRIPTION =
  'Export a workflow as JSON containing complete state (blocks, edges, variables, subflows, configuration). Use with import_workflow to clone or restore workflows. Exported data is portable between workspaces.';

/**
 * JSON Schema for MCP registration
 */
export const exportWorkflowInputSchema = exportWorkflowJsonSchema;

/**
 * Output type for export workflow
 */
export interface ExportWorkflowOutput {
  export: WorkflowExportPayload;
}

/**
 * Input type for export workflow
 */
export interface ExportWorkflowInput {
  workflowId: string;
}

/**
 * Export a workflow as JSON
 *
 * @param client - SimApiClient instance
 * @param input - Export workflow parameters
 * @returns Complete workflow export payload
 */
export async function exportWorkflow(
  client: SimApiClient,
  input: ExportWorkflowInput
): Promise<ExportWorkflowOutput> {
  const logger = getLogger();

  try {
    logger.debug('Exporting workflow', {
      operation: 'export_workflow',
      workflowId: input.workflowId,
    });

    // Call API client
    const exportData = await client.exportWorkflow(input.workflowId);

    logger.debug('Workflow exported successfully', {
      operation: 'export_workflow',
      workflowId: input.workflowId,
      hasBlocks: !!(exportData.state?.blocks && Object.keys(exportData.state.blocks).length > 0),
      hasEdges: !!(exportData.state?.edges && exportData.state.edges.length > 0),
    });

    return { export: exportData };
  } catch (error) {
    logger.error('Failed to export workflow', {
      operation: 'export_workflow',
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
