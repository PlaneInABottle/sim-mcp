import {
  AuthenticationError,
  AuthorizationError,
  SimApiError,
  SimErrorCode,
  ValidationError,
} from '../../client/index.js';
import { requireAtLeastOneParam, requireParams } from '../../utils/validation.js';

export interface ConciseMutationResult {
  success: boolean;
  warning?: string;
  warnings?: string[];
}

export function validateRequiredParams(
  params: Record<string, unknown>,
  toolName: string
): void {
  requireParams(params, toolName);
}

export function validateAtLeastOneParam(
  params: Record<string, unknown>,
  toolName: string
): void {
  requireAtLeastOneParam(params, toolName);
}

export function createConflictError(
  message: string,
  details?: Record<string, unknown>
): ValidationError {
  return new ValidationError(message, { ...(details ?? {}), category: 'workflow_state_conflict' });
}

export function isSimApiErrorWithStatus(error: unknown, statusCode: number): error is SimApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: unknown }).statusCode === statusCode
  );
}

export function mapAuthModeError(error: unknown, toolName: string): unknown {
  if (isSimApiErrorWithStatus(error, 401)) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    if (message.toLowerCase().includes('session')) {
      return new ValidationError(
        `${toolName} requires MCP/API-key-compatible workflow lifecycle access, but the backend route rejected the current auth mode`,
        { tool: toolName, category: 'auth_mode_mismatch' }
      );
    }
  }

  return error;
}

export function parseDeploymentVersionInput(
  value: unknown,
  toolName: string
): number {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    throw new ValidationError(
      `Missing required parameter 'version' for ${toolName}. Call list_deployment_versions first to find a valid version.`,
      {
        parameter: 'version',
        tool: toolName,
        nextStep: 'Call list_deployment_versions to find a valid deployment version.',
      }
    );
  }

  const normalized = typeof value === 'string' ? value.trim() : value;
  const version = typeof normalized === 'number' ? normalized : Number(normalized);

  if (!Number.isInteger(version) || version < 1) {
    throw new ValidationError(
      `${toolName} requires a positive integer deployment version. Call list_deployment_versions first to find a valid version.`,
      {
        parameter: 'version',
        tool: toolName,
        category: 'invalid_deployment_version',
        nextStep: 'Call list_deployment_versions to find a valid deployment version.',
      }
    );
  }

  return version;
}

function isWorkflowNotFoundError(error: unknown): boolean {
  return (
    error instanceof SimApiError &&
    error.statusCode === 404 &&
    (error.details?.resource === 'Workflow' || error.message.toLowerCase().includes('workflow'))
  );
}

export function createDeploymentVersionNotFoundError(toolName: string): SimApiError {
  return new SimApiError(
    `${toolName} could not find that deployment version. Call list_deployment_versions first to find a valid version.`,
    404,
    SimErrorCode.NOT_FOUND,
    {
      tool: toolName,
      category: 'deployment_version_not_found',
      nextStep: 'Call list_deployment_versions to find a valid deployment version.',
    },
    false
  );
}

export function mapDeploymentVersionError(
  error: unknown,
  toolName: string,
  options?: { rewriteVersionNotFound?: boolean; hasValidatedVersionInput?: boolean }
): unknown {
  const authMappedError = mapAuthModeError(error, toolName);

  if (authMappedError instanceof ValidationError) {
    return authMappedError;
  }

  if (
    options?.rewriteVersionNotFound &&
    options?.hasValidatedVersionInput &&
    isSimApiErrorWithStatus(authMappedError, 404) &&
    !isWorkflowNotFoundError(authMappedError)
  ) {
    return createDeploymentVersionNotFoundError(toolName);
  }

  if (isSimApiErrorWithStatus(authMappedError, 401)) {
    return new AuthenticationError(
      `${toolName} could not authenticate this deployment version action with the current credentials.`
    );
  }

  if (isSimApiErrorWithStatus(authMappedError, 403)) {
    return new AuthorizationError(
      `${toolName} requires additional workflow permissions for this deployment version action.`,
    );
  }

  if (isSimApiErrorWithStatus(authMappedError, 500) && authMappedError.message) {
    const lowerMessage = authMappedError.message.toLowerCase();

    if (lowerMessage.includes('invalid deployed state')) {
      return new SimApiError(
        `${toolName} failed because the selected deployment version has an invalid deployed state. Retry is unlikely to help until that version data is fixed.`,
        500,
        SimErrorCode.INTERNAL_ERROR,
        { tool: toolName, category: 'invalid_deployed_state', retryRecommended: false },
        false
      );
    }

    if (lowerMessage.includes('failed to sync schedules')) {
      return new SimApiError(
        `${toolName} failed while syncing schedules for that deployment version. Retry is unlikely to help until the schedule configuration is fixed.`,
        500,
        SimErrorCode.INTERNAL_ERROR,
        { tool: toolName, category: 'schedule_sync_failure', retryRecommended: false },
        false
      );
    }

    if (lowerMessage.includes('failed to sync trigger configuration')) {
      return new SimApiError(
        `${toolName} failed while syncing trigger configuration for that deployment version. Retry is unlikely to help until the trigger configuration is fixed.`,
        500,
        SimErrorCode.INTERNAL_ERROR,
        { tool: toolName, category: 'trigger_sync_failure', retryRecommended: false },
        false
      );
    }
  }

  return authMappedError;
}
