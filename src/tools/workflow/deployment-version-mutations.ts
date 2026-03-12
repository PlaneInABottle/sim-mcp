import type { SimApiClient } from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';
import {
  mapDeploymentVersionError,
  parseDeploymentVersionInput,
  validateRequiredParams,
} from './shared.js';

export const ACTIVATE_DEPLOYMENT_VERSION_TOOL_NAME = 'activate_deployment_version';

export const ACTIVATE_DEPLOYMENT_VERSION_DESCRIPTION =
  'Activate an existing deployment version for a workflow. Returns a concise success summary with deployedAt and any warnings.';

export const activateDeploymentVersionInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID that owns the deployment version',
    },
    version: {
      type: 'number',
      description: 'The deployment version number to activate',
    },
  },
  required: ['workflowId', 'version'],
};

export interface ActivateDeploymentVersionInput {
  workflowId: string;
  version: number;
}

export interface ActivateDeploymentVersionOutput {
  success: true;
  workflowId: string;
  version: number;
  deployedAt: string | null;
  warnings: string[];
}

export const REVERT_WORKFLOW_TO_DEPLOYMENT_VERSION_TOOL_NAME =
  'revert_workflow_to_deployment_version';

export const REVERT_WORKFLOW_TO_DEPLOYMENT_VERSION_DESCRIPTION =
  'Restore a workflow draft from an existing deployment version. Returns a concise success summary with lastSaved.';

export const revertWorkflowToDeploymentVersionInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID that should be reverted',
    },
    version: {
      type: 'number',
      description: 'The deployment version number to restore into draft state',
    },
  },
  required: ['workflowId', 'version'],
};

export interface RevertWorkflowToDeploymentVersionInput {
  workflowId: string;
  version: number;
}

export interface RevertWorkflowToDeploymentVersionOutput {
  success: true;
  workflowId: string;
  version: number;
  lastSaved: number;
}

export async function activateDeploymentVersion(
  client: SimApiClient,
  input: ActivateDeploymentVersionInput
): Promise<ActivateDeploymentVersionOutput> {
  const logger = getLogger();
  let hasValidatedVersionInput = false;

  try {
    validateRequiredParams({ workflowId: input.workflowId }, ACTIVATE_DEPLOYMENT_VERSION_TOOL_NAME);
    const version = parseDeploymentVersionInput(input.version, ACTIVATE_DEPLOYMENT_VERSION_TOOL_NAME);
    hasValidatedVersionInput = true;

    const result = await client.activateDeploymentVersion(input.workflowId, version);

    return {
      success: true,
      workflowId: input.workflowId,
      version,
      deployedAt: result.deployedAt,
      warnings: result.warnings ?? [],
    };
  } catch (error) {
    const mappedError = mapDeploymentVersionError(error, ACTIVATE_DEPLOYMENT_VERSION_TOOL_NAME, {
      rewriteVersionNotFound: true,
      hasValidatedVersionInput,
    });
    logger.error('Failed to activate deployment version', {
      operation: ACTIVATE_DEPLOYMENT_VERSION_TOOL_NAME,
      workflowId: input.workflowId,
      version: input.version,
      error: mappedError instanceof Error ? mappedError.message : 'Unknown error',
    });
    throw mappedError;
  }
}

export async function revertWorkflowToDeploymentVersion(
  client: SimApiClient,
  input: RevertWorkflowToDeploymentVersionInput
): Promise<RevertWorkflowToDeploymentVersionOutput> {
  const logger = getLogger();
  let hasValidatedVersionInput = false;

  try {
    validateRequiredParams(
      { workflowId: input.workflowId },
      REVERT_WORKFLOW_TO_DEPLOYMENT_VERSION_TOOL_NAME
    );
    const version = parseDeploymentVersionInput(
      input.version,
      REVERT_WORKFLOW_TO_DEPLOYMENT_VERSION_TOOL_NAME
    );
    hasValidatedVersionInput = true;

    const result = await client.revertWorkflowToDeploymentVersion(input.workflowId, version);

    return {
      success: true,
      workflowId: input.workflowId,
      version,
      lastSaved: result.lastSaved,
    };
  } catch (error) {
    const mappedError = mapDeploymentVersionError(
      error,
      REVERT_WORKFLOW_TO_DEPLOYMENT_VERSION_TOOL_NAME,
      { rewriteVersionNotFound: true, hasValidatedVersionInput }
    );
    logger.error('Failed to revert workflow to deployment version', {
      operation: REVERT_WORKFLOW_TO_DEPLOYMENT_VERSION_TOOL_NAME,
      workflowId: input.workflowId,
      version: input.version,
      error: mappedError instanceof Error ? mappedError.message : 'Unknown error',
    });
    throw mappedError;
  }
}
