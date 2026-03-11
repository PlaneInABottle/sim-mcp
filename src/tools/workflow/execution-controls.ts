import { NotFoundError, type SimApiClient, ValidationError } from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';
import { isSimApiErrorWithStatus, mapAuthModeError, validateRequiredParams } from './shared.js';

export const RUN_WORKFLOW_UNTIL_BLOCK_TOOL_NAME = 'run_workflow_until_block';

export const RUN_FROM_BLOCK_TOOL_NAME = 'run_from_block';

export const RUN_BLOCK_TOOL_NAME = 'run_block';

export const CANCEL_EXECUTION_TOOL_NAME = 'cancel_execution';

export interface PartialExecutionOutput {
  success: boolean;
  executionId?: string;
  output?: unknown;
  error?: string;
  metadata?: {
    duration?: number;
    startTime?: string;
    endTime?: string;
  };
}

export interface RunWorkflowUntilBlockInput {
  workflowId: string;
  stopAfterBlockId: string;
  input?: Record<string, unknown>;
  triggerType?: string;
  useDraftState?: boolean;
}

export interface RunFromBlockInput {
  workflowId: string;
  startBlockId: string;
  executionId?: string;
  input?: Record<string, unknown>;
  triggerType?: string;
  useDraftState?: boolean;
}

export interface RunBlockInput {
  workflowId: string;
  blockId: string;
  executionId?: string;
  input?: Record<string, unknown>;
  triggerType?: string;
  useDraftState?: boolean;
}

export interface CancelExecutionInput {
  workflowId: string;
  executionId: string;
}

export interface CancelExecutionOutput {
  success: boolean;
  executionId: string;
  redisAvailable?: boolean;
}

export const RUN_WORKFLOW_UNTIL_BLOCK_DESCRIPTION =
  'Run a workflow and stop after a specific block completes. Useful for debugging a path without running downstream blocks.';

export const runWorkflowUntilBlockInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID to run',
    },
    stopAfterBlockId: {
      type: 'string',
      description: 'The block ID after which execution should stop',
    },
    input: {
      type: 'object',
      description: 'Optional workflow input payload',
    },
    triggerType: {
      type: 'string',
      enum: ['api', 'manual', 'schedule', 'chat', 'webhook', 'mcp', 'a2a'],
      description: 'Optional trigger type override',
    },
    useDraftState: {
      type: 'boolean',
      description: 'Use draft workflow state instead of deployed state. Defaults to true.',
    },
  },
  required: ['workflowId', 'stopAfterBlockId'],
};

export const RUN_FROM_BLOCK_DESCRIPTION =
  'Run a workflow starting from a specific block using a prior execution snapshot. If executionId is omitted, the backend uses the latest snapshot for this workflow.';

export const runFromBlockInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID to run',
    },
    startBlockId: {
      type: 'string',
      description: 'The block ID to start execution from',
    },
    executionId: {
      type: 'string',
      description:
        "Optional execution snapshot to resume from. Defaults to the backend's latest snapshot for the workflow.",
    },
    input: {
      type: 'object',
      description: 'Optional workflow input payload',
    },
    triggerType: {
      type: 'string',
      enum: ['api', 'manual', 'schedule', 'chat', 'webhook', 'mcp', 'a2a'],
      description: 'Optional trigger type override',
    },
    useDraftState: {
      type: 'boolean',
      description: 'Use draft workflow state instead of deployed state. Defaults to true.',
    },
  },
  required: ['workflowId', 'startBlockId'],
};

export const RUN_BLOCK_DESCRIPTION =
  'Run a single block in isolation using a prior execution snapshot. If executionId is omitted, the backend uses the latest snapshot for this workflow.';

export const runBlockInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID',
    },
    blockId: {
      type: 'string',
      description: 'The block ID to run in isolation',
    },
    executionId: {
      type: 'string',
      description:
        "Optional execution snapshot to reuse. Defaults to the backend's latest snapshot for the workflow.",
    },
    input: {
      type: 'object',
      description: 'Optional workflow input payload',
    },
    triggerType: {
      type: 'string',
      enum: ['api', 'manual', 'schedule', 'chat', 'webhook', 'mcp', 'a2a'],
      description: 'Optional trigger type override',
    },
    useDraftState: {
      type: 'boolean',
      description: 'Use draft workflow state instead of deployed state. Defaults to true.',
    },
  },
  required: ['workflowId', 'blockId'],
};

export const CANCEL_EXECUTION_DESCRIPTION =
  'Cancel an active workflow execution by execution ID. Useful for stopping long-running or stuck runs.';

export const cancelExecutionInputSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'The workflow ID that owns the execution',
    },
    executionId: {
      type: 'string',
      description: 'The execution ID to cancel',
    },
  },
  required: ['workflowId', 'executionId'],
};

function buildPartialExecutionResult<TTarget extends Record<string, string>>(
  result: PartialExecutionOutput,
  target: TTarget
): PartialExecutionOutput & TTarget {
  return {
    success: result.success,
    executionId: result.executionId,
    ...target,
    output: result.output,
    error: result.error,
    metadata: result.metadata,
  };
}

export async function runWorkflowUntilBlock(
  client: SimApiClient,
  input: RunWorkflowUntilBlockInput
): Promise<PartialExecutionOutput & { stopAfterBlockId: string }> {
  const logger = getLogger();

  try {
    validateRequiredParams(
      { workflowId: input.workflowId, stopAfterBlockId: input.stopAfterBlockId },
      RUN_WORKFLOW_UNTIL_BLOCK_TOOL_NAME
    );

    const result = await client.executeWorkflow(input.workflowId, {
      input: input.input,
      triggerType: input.triggerType,
      useDraftState: input.useDraftState ?? true,
      stopAfterBlockId: input.stopAfterBlockId,
    });

    logger.debug('Workflow executed until block', {
      operation: RUN_WORKFLOW_UNTIL_BLOCK_TOOL_NAME,
      workflowId: input.workflowId,
      executionId: result.executionId,
      stopAfterBlockId: input.stopAfterBlockId,
    });

    return buildPartialExecutionResult(result, { stopAfterBlockId: input.stopAfterBlockId });
  } catch (error) {
    logger.error('Failed to execute workflow until block', {
      operation: RUN_WORKFLOW_UNTIL_BLOCK_TOOL_NAME,
      workflowId: input.workflowId,
      stopAfterBlockId: input.stopAfterBlockId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    mapExecutionControlError(error, input.workflowId);
  }
}

export async function runFromBlock(
  client: SimApiClient,
  input: RunFromBlockInput
): Promise<PartialExecutionOutput & { startBlockId: string }> {
  const logger = getLogger();

  try {
    validateRequiredParams(
      { workflowId: input.workflowId, startBlockId: input.startBlockId },
      RUN_FROM_BLOCK_TOOL_NAME
    );

    const result = await client.executeWorkflow(input.workflowId, {
      input: input.input,
      triggerType: input.triggerType,
      useDraftState: input.useDraftState ?? true,
      runFromBlock: {
        startBlockId: input.startBlockId,
        executionId: input.executionId ?? 'latest',
      },
    });

    logger.debug('Workflow executed from block', {
      operation: RUN_FROM_BLOCK_TOOL_NAME,
      workflowId: input.workflowId,
      executionId: result.executionId,
      startBlockId: input.startBlockId,
      sourceExecutionId: input.executionId ?? 'latest',
    });

    return buildPartialExecutionResult(result, { startBlockId: input.startBlockId });
  } catch (error) {
    logger.error('Failed to execute workflow from block', {
      operation: RUN_FROM_BLOCK_TOOL_NAME,
      workflowId: input.workflowId,
      startBlockId: input.startBlockId,
      executionId: input.executionId ?? 'latest',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    mapExecutionControlError(error, input.workflowId, input.executionId ?? 'latest');
  }
}

export async function runBlock(
  client: SimApiClient,
  input: RunBlockInput
): Promise<PartialExecutionOutput & { blockId: string }> {
  const logger = getLogger();

  try {
    validateRequiredParams(
      { workflowId: input.workflowId, blockId: input.blockId },
      RUN_BLOCK_TOOL_NAME
    );

    const result = await client.executeWorkflow(input.workflowId, {
      input: input.input,
      triggerType: input.triggerType,
      useDraftState: input.useDraftState ?? true,
      stopAfterBlockId: input.blockId,
      runFromBlock: {
        startBlockId: input.blockId,
        executionId: input.executionId ?? 'latest',
      },
    });

    logger.debug('Workflow executed for single block', {
      operation: RUN_BLOCK_TOOL_NAME,
      workflowId: input.workflowId,
      executionId: result.executionId,
      blockId: input.blockId,
      sourceExecutionId: input.executionId ?? 'latest',
    });

    return buildPartialExecutionResult(result, { blockId: input.blockId });
  } catch (error) {
    logger.error('Failed to execute single block', {
      operation: RUN_BLOCK_TOOL_NAME,
      workflowId: input.workflowId,
      blockId: input.blockId,
      executionId: input.executionId ?? 'latest',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    mapExecutionControlError(error, input.workflowId, input.executionId ?? 'latest');
  }
}

export async function cancelExecution(
  client: SimApiClient,
  input: CancelExecutionInput
): Promise<CancelExecutionOutput> {
  const logger = getLogger();

  try {
    validateRequiredParams(
      { workflowId: input.workflowId, executionId: input.executionId },
      CANCEL_EXECUTION_TOOL_NAME
    );

    const result = await client.cancelExecution(input.workflowId, input.executionId);

    logger.debug('Execution cancelled', {
      operation: CANCEL_EXECUTION_TOOL_NAME,
      workflowId: input.workflowId,
      executionId: input.executionId,
      redisAvailable: result.redisAvailable,
    });

    return result;
  } catch (error) {
    logger.error('Failed to cancel execution', {
      operation: CANCEL_EXECUTION_TOOL_NAME,
      workflowId: input.workflowId,
      executionId: input.executionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    mapExecutionControlError(error, input.workflowId, input.executionId);
  }
}

function mapExecutionControlError(error: unknown, workflowId: string, executionId?: string): never {
  const mappedError = mapAuthModeError(error, 'workflow execution control');

  if (isSimApiErrorWithStatus(mappedError, 404)) {
    const details =
      typeof mappedError === 'object' && mappedError !== null && 'details' in mappedError
        ? (mappedError as { details?: Record<string, unknown> }).details
        : undefined;
    const resource = typeof details?.resource === 'string' ? details.resource.toLowerCase() : '';
    const message = mappedError instanceof Error ? mappedError.message.toLowerCase() : '';
    const isExecutionNotFound =
      !!executionId &&
      (resource === 'execution' ||
        resource === 'execution state' ||
        message.includes('execution not found') ||
        message.includes('execution state not found'));

    if (isExecutionNotFound) {
      throw new NotFoundError('Execution', executionId);
    }

    throw new NotFoundError('Workflow', workflowId);
  }

  if (isSimApiErrorWithStatus(mappedError, 400)) {
    const message =
      mappedError instanceof Error ? mappedError.message : 'Invalid execution request';
    if (message.includes('No execution state found')) {
      throw new ValidationError(message, {
        workflowId,
        executionId,
        category: 'missing_execution_snapshot',
      });
    }
  }

  throw mappedError;
}
