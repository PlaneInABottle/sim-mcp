/**
 * Export Workflow Tool
 *
 * MCP tool for exporting a workflow as JSON.
 * Supports lightweight (default) and verbose modes:
 * - Lightweight: Structure and connections only (no subBlocks/data) - ~2-5 KB
 * - Verbose: Complete state for backup/cloning
 */

import type { SimApiClient } from '../../client/index.js';
import type { WorkflowExportPayload, WorkflowState } from '../../client/types.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const EXPORT_WORKFLOW_TOOL_NAME = 'export_workflow';

/**
 * Tool description for MCP registration
 */
export const EXPORT_WORKFLOW_DESCRIPTION =
  'Export a workflow as JSON. By default returns lightweight export (structure/connections only - ~2-5 KB) for understanding workflow layout. Use get_block for detailed block configuration. Set verbose=true for complete state including all block configurations (for backup/cloning).';

/**
 * JSON Schema for MCP registration
 */
export const exportWorkflowInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow to export',
    },
    verbose: {
      type: 'boolean',
      description:
        'If true, returns complete workflow state (all block configs, subBlocks, data) for backup/cloning. If false (default), returns lightweight export with structure and connections only.',
    },
  },
  required: ['workflowId'],
};

/**
 * Lightweight block representation (no subBlocks/data)
 */
export interface LightweightBlock {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  enabled: boolean;
  outputs?: Record<string, unknown>;
}

/**
 * Lightweight variable representation (no values)
 */
export interface LightweightVariable {
  id: string;
  name: string;
  type: string;
}

/**
 * Lightweight workflow state
 */
export interface LightweightWorkflowState {
  blocks: Record<string, LightweightBlock>;
  edges: WorkflowState['edges'];
  loops: Record<string, unknown>;
  parallels: Record<string, unknown>;
  variables?: LightweightVariable[];
}

/**
 * Lightweight export payload
 */
export interface LightweightExportPayload {
  version: string;
  exportedAt: string;
  workflow: WorkflowExportPayload['workflow'];
  state: LightweightWorkflowState;
  _lightweight: true;
}

/**
 * Output type for export workflow (can be full or lightweight)
 */
export interface ExportWorkflowOutput {
  export: WorkflowExportPayload | LightweightExportPayload;
}

/**
 * Input type for export workflow
 */
export interface ExportWorkflowInput {
  workflowId: string;
  verbose?: boolean;
}

/**
 * Strip block details to create lightweight representation
 * Keeps: id, type, name, position, enabled, outputs
 * Removes: subBlocks, data, config
 */
export function stripBlockDetails(block: Record<string, unknown>): LightweightBlock {
  return {
    id: block.id as string,
    type: block.type as string,
    name: block.name as string,
    position: block.position as { x: number; y: number },
    enabled: block.enabled !== false,
    ...(block.outputs ? { outputs: block.outputs as Record<string, unknown> } : {}),
  };
}

/**
 * Strip variable details to create lightweight representation
 * Keeps: id, name, type
 * Removes: value
 */
function stripVariableDetails(
  variable: { id: string; name: string; type: string; value?: unknown }
): LightweightVariable {
  return {
    id: variable.id,
    name: variable.name,
    type: variable.type,
  };
}

/**
 * Create lightweight export from full export
 */
function createLightweightExport(fullExport: WorkflowExportPayload): LightweightExportPayload {
  const lightweightBlocks: Record<string, LightweightBlock> = {};

  // Strip block details
  if (fullExport.state?.blocks) {
    for (const [blockId, block] of Object.entries(fullExport.state.blocks)) {
      lightweightBlocks[blockId] = stripBlockDetails(block as Record<string, unknown>);
    }
  }

  // Strip variable details
  const lightweightVariables = fullExport.state?.variables?.map(stripVariableDetails);

  return {
    version: fullExport.version,
    exportedAt: fullExport.exportedAt,
    workflow: fullExport.workflow,
    state: {
      blocks: lightweightBlocks,
      edges: fullExport.state?.edges ?? [],
      loops: fullExport.state?.loops ?? {},
      parallels: fullExport.state?.parallels ?? {},
      ...(lightweightVariables ? { variables: lightweightVariables } : {}),
    },
    _lightweight: true,
  };
}

/**
 * Export a workflow as JSON
 *
 * @param client - SimApiClient instance
 * @param input - Export workflow parameters
 * @returns Workflow export payload (lightweight by default, full if verbose=true)
 */
export async function exportWorkflow(
  client: SimApiClient,
  input: ExportWorkflowInput
): Promise<ExportWorkflowOutput> {
  const logger = getLogger();
  const verbose = input.verbose ?? false;

  try {
    logger.debug('Exporting workflow', {
      operation: 'export_workflow',
      workflowId: input.workflowId,
      verbose,
    });

    // Call API client to get full export
    const exportData = await client.exportWorkflow(input.workflowId);

    // Create lightweight or return full export based on verbose flag
    const result = verbose ? exportData : createLightweightExport(exportData);

    const blockCount = result.state?.blocks ? Object.keys(result.state.blocks).length : 0;
    const edgeCount = result.state?.edges?.length ?? 0;

    logger.debug('Workflow exported successfully', {
      operation: 'export_workflow',
      workflowId: input.workflowId,
      verbose,
      blockCount,
      edgeCount,
      lightweight: !verbose,
    });

    return { export: result };
  } catch (error) {
    logger.error('Failed to export workflow', {
      operation: 'export_workflow',
      workflowId: input.workflowId,
      verbose,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
