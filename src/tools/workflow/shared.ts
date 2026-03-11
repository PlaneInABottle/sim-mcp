import { type SimApiError, ValidationError } from '../../client/index.js';
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
