/**
 * Get Execution Logs Tools
 *
 * MCP tools for retrieving workflow execution logs.
 * - get_execution_logs: List/filter execution logs via GET /api/v1/logs
 * - get_execution_log_detail: Get full detail for a specific log via GET /api/v1/logs/{id}
 */

import type { SimApiClient } from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';
import { validateRequiredParams } from './shared.js';

// ==========================================
// get_execution_logs
// ==========================================

/**
 * Tool name constant
 */
export const GET_EXECUTION_LOGS_TOOL_NAME = 'get_execution_logs';

/**
 * Tool description for MCP registration
 */
export const GET_EXECUTION_LOGS_DESCRIPTION =
  'List and filter workflow execution logs. Returns an array of execution logs with optional ' +
  'trace spans, cost data, and final output. Requires a workspaceId. Supports filtering by ' +
  'workflow, execution ID, log level, date range, duration, cost, and trigger type. ' +
  'Uses cursor-based pagination.';

/**
 * JSON Schema for get_execution_logs input (for MCP registration)
 */
export const getExecutionLogsInputSchema = {
  type: 'object',
  properties: {
    workspaceId: {
      type: 'string',
      description: 'The workspace ID to fetch logs for (required)',
    },
    workflowId: {
      type: 'string',
      description: 'Filter logs to a specific workflow ID',
    },
    executionId: {
      type: 'string',
      description: 'Filter logs to a specific execution ID',
    },
    level: {
      type: 'string',
      enum: ['info', 'error'],
      description: 'Filter by log level',
    },
    startDate: {
      type: 'string',
      description: 'Filter logs after this ISO 8601 date',
    },
    endDate: {
      type: 'string',
      description: 'Filter logs before this ISO 8601 date',
    },
    minDurationMs: {
      type: 'number',
      description: 'Filter logs with duration >= this value in milliseconds',
    },
    maxDurationMs: {
      type: 'number',
      description: 'Filter logs with duration <= this value in milliseconds',
    },
    minCost: {
      type: 'number',
      description: 'Filter logs with total cost >= this value',
    },
    maxCost: {
      type: 'number',
      description: 'Filter logs with total cost <= this value',
    },
    trigger: {
      type: 'string',
      description: 'Filter by trigger type (e.g., "api", "manual", "schedule", "webhook")',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of logs to return (default: 100)',
    },
    cursor: {
      type: 'string',
      description: 'Cursor for pagination. Use the nextCursor from the previous response.',
    },
    order: {
      type: 'string',
      enum: ['desc', 'asc'],
      description: 'Sort order by start time (default: "desc")',
    },
    details: {
      type: 'string',
      enum: ['basic', 'full'],
      description:
        'Level of detail to return. "basic" returns summary fields, "full" includes execution data and workflow context (default: "basic")',
    },
    includeTraceSpans: {
      type: 'boolean',
      description:
        'Include trace spans in the response (requires details=full). Shows per-block execution traces.',
    },
    includeFinalOutput: {
      type: 'boolean',
      description:
        'Include the final output of the workflow execution (requires details=full).',
    },
  },
  required: ['workspaceId'],
};

/**
 * Input type for get_execution_logs
 */
export interface GetExecutionLogsInput {
  workspaceId: string;
  workflowId?: string;
  executionId?: string;
  level?: 'info' | 'error';
  startDate?: string;
  endDate?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
  minCost?: number;
  maxCost?: number;
  trigger?: string;
  limit?: number;
  cursor?: string;
  order?: 'desc' | 'asc';
  details?: 'basic' | 'full';
  includeTraceSpans?: boolean;
  includeFinalOutput?: boolean;
}

/**
 * Output type for get_execution_logs
 */
export interface GetExecutionLogsOutput {
  data: Array<Record<string, unknown>>;
  nextCursor?: string;
  limits?: Record<string, unknown>;
}

/**
 * List and filter workflow execution logs
 *
 * @param client - SimApiClient instance
 * @param input - Filter and pagination parameters
 * @returns Array of execution logs with pagination info
 */
export async function getExecutionLogs(
  client: SimApiClient,
  input: GetExecutionLogsInput
): Promise<GetExecutionLogsOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams({ workspaceId: input.workspaceId }, GET_EXECUTION_LOGS_TOOL_NAME);

    logger.debug('Fetching execution logs', {
      operation: 'get_execution_logs',
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
      executionId: input.executionId,
      level: input.level,
    });

    const result = await client.getLogs(input);

    logger.debug('Execution logs fetched', {
      operation: 'get_execution_logs',
      workspaceId: input.workspaceId,
      count: result.data?.length ?? 0,
      hasMore: !!result.nextCursor,
    });

    return result;
  } catch (error) {
    logger.error('Failed to fetch execution logs', {
      operation: 'get_execution_logs',
      workspaceId: input.workspaceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ==========================================
// get_execution_log_detail
// ==========================================

/**
 * Tool name constant
 */
export const GET_EXECUTION_LOG_DETAIL_TOOL_NAME = 'get_execution_log_detail';

/**
 * Tool description for MCP registration
 */
export const GET_EXECUTION_LOG_DETAIL_DESCRIPTION =
  'Get full detail for a specific execution log by its ID. Returns comprehensive log data including ' +
  'execution data, workflow context, cost breakdown, trace spans, and final output.';

/**
 * JSON Schema for get_execution_log_detail input (for MCP registration)
 */
export const getExecutionLogDetailInputSchema = {
  type: 'object',
  properties: {
    logId: {
      type: 'string',
      description: 'The unique identifier of the execution log to retrieve',
    },
  },
  required: ['logId'],
};

/**
 * Input type for get_execution_log_detail
 */
export interface GetExecutionLogDetailInput {
  logId: string;
}

/**
 * Output type for get_execution_log_detail
 */
export interface GetExecutionLogDetailOutput {
  data: Record<string, unknown>;
  limits?: Record<string, unknown>;
}

/**
 * Get full detail for a specific execution log
 *
 * @param client - SimApiClient instance
 * @param input - Log ID parameter
 * @returns Full log detail with execution data
 */
export async function getExecutionLogDetail(
  client: SimApiClient,
  input: GetExecutionLogDetailInput
): Promise<GetExecutionLogDetailOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams({ logId: input.logId }, GET_EXECUTION_LOG_DETAIL_TOOL_NAME);

    logger.debug('Fetching execution log detail', {
      operation: 'get_execution_log_detail',
      logId: input.logId,
    });

    const result = await client.getLogDetail(input.logId);

    logger.debug('Execution log detail fetched', {
      operation: 'get_execution_log_detail',
      logId: input.logId,
      hasData: !!result.data,
    });

    return result;
  } catch (error) {
    logger.error('Failed to fetch execution log detail', {
      operation: 'get_execution_log_detail',
      logId: input.logId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
