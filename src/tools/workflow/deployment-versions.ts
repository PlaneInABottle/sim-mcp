import type {
  DeploymentVersionSummary,
  SimApiClient,
  WorkflowState,
} from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';
import {
  createDeploymentVersionNotFoundError,
  mapDeploymentVersionError,
  parseDeploymentVersionInput,
  validateRequiredParams,
} from './shared.js';

export const LIST_DEPLOYMENT_VERSIONS_TOOL_NAME = 'list_deployment_versions';

export const LIST_DEPLOYMENT_VERSIONS_DESCRIPTION =
  'List deployment versions for a workflow. Returns concise version summaries so you can choose a valid version before activation or revert.';

export const listDeploymentVersionsInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID whose deployment versions should be listed',
    },
  },
  required: ['workflowId'],
};

export interface ListDeploymentVersionsInput {
  workflowId: string;
}

export interface ListDeploymentVersionsOutput {
  workflowId: string;
  versions: DeploymentVersionSummary[];
}

export const GET_DEPLOYMENT_VERSION_TOOL_NAME = 'get_deployment_version';

export const GET_DEPLOYMENT_VERSION_DESCRIPTION =
  'Get one deployment version summary for a workflow. Returns concise metadata by default, and includes deployedState only when includeState=true.';

export const getDeploymentVersionInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID that owns the deployment version',
    },
    version: {
      type: 'number',
      description: 'The deployment version number to retrieve',
    },
    includeState: {
      type: 'boolean',
      description: 'If true, include the full deployed workflow state for this version',
    },
  },
  required: ['workflowId', 'version'],
};

export interface GetDeploymentVersionInput {
  workflowId: string;
  version: number;
  includeState?: boolean;
}

export interface GetDeploymentVersionOutput {
  workflowId: string;
  version: DeploymentVersionSummary;
  deployedState?: WorkflowState;
}

function summarizeDeploymentVersion(
  version: DeploymentVersionSummary
): ListDeploymentVersionsOutput['versions'][number] {
  return {
    version: version.version,
    name: version.name,
    description: version.description,
    isActive: version.isActive,
    createdAt: version.createdAt,
    deployedBy: version.deployedBy,
  };
}

export async function listDeploymentVersions(
  client: SimApiClient,
  input: ListDeploymentVersionsInput
): Promise<ListDeploymentVersionsOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams({ workflowId: input.workflowId }, LIST_DEPLOYMENT_VERSIONS_TOOL_NAME);

    const response = await client.listDeploymentVersions(input.workflowId);

    return {
      workflowId: input.workflowId,
      versions: response.versions.map((version) => summarizeDeploymentVersion(version)),
    };
  } catch (error) {
    const mappedError = mapDeploymentVersionError(error, LIST_DEPLOYMENT_VERSIONS_TOOL_NAME);
    logger.error('Failed to list deployment versions', {
      operation: LIST_DEPLOYMENT_VERSIONS_TOOL_NAME,
      workflowId: input.workflowId,
      error: mappedError instanceof Error ? mappedError.message : 'Unknown error',
    });
    throw mappedError;
  }
}

export async function getDeploymentVersion(
  client: SimApiClient,
  input: GetDeploymentVersionInput
): Promise<GetDeploymentVersionOutput> {
  const logger = getLogger();
  let hasValidatedVersionInput = false;

  try {
    validateRequiredParams({ workflowId: input.workflowId }, GET_DEPLOYMENT_VERSION_TOOL_NAME);
    const versionNumber = parseDeploymentVersionInput(
      input.version,
      GET_DEPLOYMENT_VERSION_TOOL_NAME
    );
    hasValidatedVersionInput = true;

    const versionsResponse = await client.listDeploymentVersions(input.workflowId);
    const matchingVersion = versionsResponse.versions.find((version) => version.version === versionNumber);

    if (!matchingVersion) {
      throw createDeploymentVersionNotFoundError(GET_DEPLOYMENT_VERSION_TOOL_NAME);
    }

    if (!input.includeState) {
      return {
        workflowId: input.workflowId,
        version: summarizeDeploymentVersion(matchingVersion),
      };
    }

    const stateResponse = await client.getDeploymentVersion(input.workflowId, versionNumber);

    return {
      workflowId: input.workflowId,
      version: summarizeDeploymentVersion(matchingVersion),
      deployedState: stateResponse.deployedState,
    };
  } catch (error) {
    const mappedError = mapDeploymentVersionError(error, GET_DEPLOYMENT_VERSION_TOOL_NAME, {
      rewriteVersionNotFound: true,
      hasValidatedVersionInput,
    });
    logger.error('Failed to get deployment version', {
      operation: GET_DEPLOYMENT_VERSION_TOOL_NAME,
      workflowId: input.workflowId,
      version: input.version,
      includeState: input.includeState ?? false,
      error: mappedError instanceof Error ? mappedError.message : 'Unknown error',
    });
    throw mappedError;
  }
}
