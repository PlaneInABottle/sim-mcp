/**
 * Import Workflow Tool
 *
 * MCP tool for importing a workflow from JSON.
 * Creates a new workflow from exported data.
 */

import type { SimApiClient } from '../../client/index.js';
import type { ImportWorkflowResponse } from '../../client/types.js';
import { importWorkflowJsonSchema } from '../../schemas/operations.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const IMPORT_WORKFLOW_TOOL_NAME = 'import_workflow';

/**
 * Tool description for MCP registration
 */
export const IMPORT_WORKFLOW_DESCRIPTION =
  'Import a workflow from JSON data. Creates a new workflow in the specified workspace from exported workflow data. Use export_workflow to get the workflow data format.';

/**
 * JSON Schema for MCP registration
 */
export const importWorkflowInputSchema = importWorkflowJsonSchema;

/**
 * Output type for import workflow
 */
export interface ImportWorkflowOutput {
  workflowId: string;
  name: string;
  success: boolean;
}

/**
 * Input type for import workflow
 */
export interface ImportWorkflowInput {
  workspaceId: string;
  folderId?: string;
  name?: string;
  workflow: Record<string, unknown>;
}

/**
 * Import a workflow from JSON data
 *
 * @param client - SimApiClient instance
 * @param input - Import workflow parameters
 * @returns Import result with new workflow ID
 */
export async function importWorkflow(
  client: SimApiClient,
  input: ImportWorkflowInput
): Promise<ImportWorkflowOutput> {
  const logger = getLogger();

  try {
    logger.debug('Importing workflow', {
      operation: 'import_workflow',
      workspaceId: input.workspaceId,
      folderId: input.folderId,
      name: input.name,
    });

    // Call API client
    const result: ImportWorkflowResponse = await client.importWorkflow({
      workspaceId: input.workspaceId,
      folderId: input.folderId,
      name: input.name,
      workflow: input.workflow as unknown as import('../../client/types.js').WorkflowState,
    });

    logger.debug('Workflow imported successfully', {
      operation: 'import_workflow',
      workflowId: result.workflowId,
      name: result.name,
    });

    return {
      workflowId: result.workflowId,
      name: result.name,
      success: result.success,
    };
  } catch (error) {
    logger.error('Failed to import workflow', {
      operation: 'import_workflow',
      workspaceId: input.workspaceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
