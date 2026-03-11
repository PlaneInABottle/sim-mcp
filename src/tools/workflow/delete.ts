import { ValidationError, type SimApiClient, type WorkflowDeleteCheckResult } from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';
import { mapAuthModeError, validateRequiredParams } from './shared.js';

export const DELETE_WORKFLOW_TOOL_NAME = 'delete_workflow';

export const DELETE_WORKFLOW_DESCRIPTION =
  'Delete a workflow. Supports checking published templates first and explicit template handling before deletion.';

export const deleteWorkflowInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID to delete',
    },
    checkTemplates: {
      type: 'boolean',
      description: 'If true, only return the published-template summary and do not delete the workflow',
    },
    templateAction: {
      type: 'string',
      enum: ['delete', 'orphan'],
      description: 'How to handle published templates before deletion',
    },
  },
  required: ['workflowId'],
};

export interface DeleteWorkflowInput {
  workflowId: string;
  checkTemplates?: boolean;
  templateAction?: 'delete' | 'orphan';
}

export type DeleteWorkflowOutput =
  | {
      success: true;
      workflowId: string;
      deleted: true;
      templateAction?: 'delete' | 'orphan';
    }
  | ({ success: true; workflowId: string; checkOnly: true } & WorkflowDeleteCheckResult);

export async function deleteWorkflow(
  client: SimApiClient,
  input: DeleteWorkflowInput
): Promise<DeleteWorkflowOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams({ workflowId: input.workflowId }, DELETE_WORKFLOW_TOOL_NAME);

    logger.debug('Deleting workflow', {
      operation: DELETE_WORKFLOW_TOOL_NAME,
      workflowId: input.workflowId,
      checkTemplates: input.checkTemplates,
      templateAction: input.templateAction,
    });

    if (input.checkTemplates) {
      const summary = await client.deleteWorkflow({
        workflowId: input.workflowId,
        checkTemplates: true,
      });

      return {
        success: true,
        workflowId: input.workflowId,
        checkOnly: true,
        hasPublishedTemplates: summary?.hasPublishedTemplates ?? false,
        count: summary?.count ?? 0,
        publishedTemplates: summary?.publishedTemplates ?? [],
      };
    }

    const templateSummary = await client.deleteWorkflow({
      workflowId: input.workflowId,
      checkTemplates: true,
    });

    if (templateSummary?.hasPublishedTemplates && !input.templateAction) {
      throw new ValidationError(
        "Workflow has published templates. Re-run delete_workflow with templateAction='delete' to remove them or templateAction='orphan' to detach them before deletion.",
        {
          parameter: 'templateAction',
          tool: DELETE_WORKFLOW_TOOL_NAME,
          templateCount: templateSummary.count,
        }
      );
    }

    await client.deleteWorkflow({
      workflowId: input.workflowId,
      templateAction: input.templateAction,
    });

    return {
      success: true,
      workflowId: input.workflowId,
      deleted: true,
      ...(input.templateAction ? { templateAction: input.templateAction } : {}),
    };
  } catch (error) {
    const mappedError = mapAuthModeError(error, DELETE_WORKFLOW_TOOL_NAME);
    logger.error('Failed to delete workflow', {
      operation: DELETE_WORKFLOW_TOOL_NAME,
      workflowId: input.workflowId,
      error: mappedError instanceof Error ? mappedError.message : 'Unknown error',
    });
    throw mappedError;
  }
}
