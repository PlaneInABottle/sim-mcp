/**
 * Broadcast Warning Utility
 *
 * Shared helper for detecting and surfacing WebSocket broadcast failures
 * in operation tool responses. When broadcastSent is false, the operation
 * was persisted to the database but the UI will not auto-update.
 */

import type { OperationResponse } from '../client/types.js';
import { getLogger } from './logger.js';

/**
 * Warning message returned when broadcast fails
 */
export const BROADCAST_FAILURE_WARNING =
  'Operation completed successfully but real-time UI sync failed. ' +
  'The change was saved to the database but connected UI clients may not see it until they refresh the page. ' +
  'This usually happens when the socket server is not running or misconfigured.';

/**
 * Check if a broadcast failed and log a warning if so.
 *
 * @param result - The OperationResponse from the API
 * @param operation - The operation name for logging context
 * @param workflowId - The workflow ID for logging context
 * @returns The warning string if broadcast failed, undefined otherwise
 */
export function checkBroadcastFailure(
  result: OperationResponse,
  operation: string,
  workflowId: string
): string | undefined {
  if (result.broadcastSent === false) {
    const logger = getLogger();
    logger.warn('Operation succeeded but UI sync failed', {
      operation,
      workflowId,
      operationId: result.operationId,
    });
    return BROADCAST_FAILURE_WARNING;
  }
  return undefined;
}
