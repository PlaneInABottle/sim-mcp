/**
 * Workflow Tools Unit Tests
 *
 * Comprehensive tests for all workflow tools including new operation-based tools.
 * Uses mocked SimApiClient to isolate tool logic.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  NotFoundError,
  SimApiError,
  SimErrorCode,
  ValidationError,
} from '../../../src/client/index.js';
import type { Block } from '../../../src/schemas/workflow.js';
import {
  activateDeploymentVersion,
  cancelExecution,
  deleteWorkflow,
  deployWorkflow,
  getDeployedWorkflowState,
  getDeploymentVersion,
  getExecutionLogDetail,
  getExecutionLogs,
  getWorkflow,
  getWorkflowStatus,
  listDeploymentVersions,
  listWorkflows,
  revertWorkflowToDeploymentVersion,
  runBlock,
  runFromBlock,
  runWorkflowUntilBlock,
  undeployWorkflow,
  validateWorkflow,
} from '../../../src/tools/workflow/index.js';
import {
  createMockSimApiClient,
  mockActivateDeploymentVersionResult,
  mockCancelExecutionResult,
  mockDeployedWorkflow,
  mockDeploymentVersionStateResult,
  mockExecutionLogDetail,
  mockExecutionLogs,
  mockRevertDeploymentVersionResult,
  mockWorkflow,
  mockWorkflowDeleteCheckResult,
  mockWorkflowValidationWorkflow,
} from '../../mocks/sim-api.js';

// Mock the logger to avoid output during tests
vi.mock('../../../src/utils/logger.js', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('Workflow Tools', () => {
  describe('listWorkflows', () => {
    it('should return list of workflows', async () => {
      const mockClient = createMockSimApiClient();

      const result = await listWorkflows(mockClient, {});

      expect(result.workflows).toHaveLength(2);
      expect(result.workflows[0]).toEqual(mockWorkflow);
      expect(result.workflows[1]).toEqual(mockDeployedWorkflow);
    });

    it('should pass workspace filter to client', async () => {
      const mockClient = createMockSimApiClient();

      await listWorkflows(mockClient, { workspaceId: 'ws-123' });

      expect(mockClient.listWorkflows).toHaveBeenCalledWith({
        workspaceId: 'ws-123',
        limit: 50,
        offset: 0,
      });
    });

    it('should use default pagination values', async () => {
      const mockClient = createMockSimApiClient();

      await listWorkflows(mockClient, {});

      expect(mockClient.listWorkflows).toHaveBeenCalledWith({
        workspaceId: undefined,
        limit: 50,
        offset: 0,
      });
    });

    it('should handle empty list', async () => {
      const mockClient = createMockSimApiClient({
        listWorkflows: async () => [],
      });

      const result = await listWorkflows(mockClient, {});

      expect(result.workflows).toHaveLength(0);
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        listWorkflows: async () => {
          throw new Error('API error');
        },
      });

      await expect(listWorkflows(mockClient, {})).rejects.toThrow('API error');
    });
  });

  describe('getWorkflow', () => {
    it('should return workflow with blocks and edges', async () => {
      const mockClient = createMockSimApiClient();

      const result = await getWorkflow(mockClient, { workflowId: 'wf-123' });

      expect(result.workflow).toBeDefined();
      expect(result.workflow.id).toBe('wf-123');
      expect(result.workflow.blocks).toHaveLength(2);
      expect(result.workflow.edges).toHaveLength(1);

      const configBlock = result.workflow.blocks?.find((block) => block.id === 'block-2') as
        | (Block & { data?: Record<string, unknown> })
        | undefined;

      expect(configBlock?.config).toBeUndefined();
      expect(configBlock?.subBlocks).toBeUndefined();
      expect(configBlock?.data).toBeUndefined();
    });

    it('should include block config when verbose=true', async () => {
      const mockClient = createMockSimApiClient();

      const result = await getWorkflow(mockClient, { workflowId: 'wf-123', verbose: true });
      const configBlock = result.workflow.blocks?.find((block) => block.id === 'block-2') as
        | (Block & { data?: Record<string, unknown> })
        | undefined;

      expect(configBlock?.config).toBeDefined();
      expect(configBlock?.subBlocks).toBeDefined();
      expect(configBlock?.data).toBeDefined();
    });

    it('should call client with correct workflowId', async () => {
      const mockClient = createMockSimApiClient();

      await getWorkflow(mockClient, { workflowId: 'wf-test-id' });

      expect(mockClient.getWorkflow).toHaveBeenCalledWith('wf-test-id');
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        getWorkflow: async () => {
          throw new Error('Network error');
        },
      });

      await expect(getWorkflow(mockClient, { workflowId: 'wf-123' })).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('validateWorkflow', () => {
    it('calls the raw-state validation helper and returns { validation }', async () => {
      const mockClient = createMockSimApiClient();

      const result = await validateWorkflow(mockClient, { workflowId: 'wf-123' });

      expect(mockClient.getWorkflowStateForValidation).toHaveBeenCalledWith('wf-123');
      expect(result).toEqual({
        validation: expect.objectContaining({
          workflowId: 'wf-123',
          valid: true,
          errors: [],
          warnings: [],
          summary: expect.objectContaining({
            enabledBlocks: 2,
            enabledRoots: 1,
            enabledReachableBlocks: 2,
            edgesChecked: 1,
          }),
        }),
      });
      expect(mockClient.getWorkflow).not.toHaveBeenCalled();
    });

    it('propagates client fetch failures', async () => {
      const mockClient = createMockSimApiClient({
        getWorkflowStateForValidation: async () => {
          throw new Error('validation fetch failed');
        },
      });

      await expect(validateWorkflow(mockClient, { workflowId: 'wf-123' })).rejects.toThrow(
        'validation fetch failed'
      );
    });

    it('returns machine-readable findings from the pure validator', async () => {
      const mockClient = createMockSimApiClient();

      const result = await validateWorkflow(mockClient, { workflowId: 'wf-123' });

      expect(Object.keys(result)).toEqual(['validation']);
      expect(Object.keys(result.validation)).toEqual([
        'workflowId',
        'valid',
        'summary',
        'errors',
        'warnings',
      ]);
      expect(result.validation.workflowId).toBe(mockWorkflowValidationWorkflow.id);
    });
  });

  describe('getWorkflowStatus', () => {
    it('should return workflow status', async () => {
      const mockClient = createMockSimApiClient();

      const result = await getWorkflowStatus(mockClient, { workflowId: 'wf-123' });

      expect(result.isDeployed).toBe(true);
      expect(result.needsRedeployment).toBe(false);
      expect(mockClient.getWorkflowStatus).toHaveBeenCalledWith('wf-123');
    });
  });

  describe('getDeployedWorkflowState', () => {
    it('should return deployed state', async () => {
      const mockClient = createMockSimApiClient();

      const result = await getDeployedWorkflowState(mockClient, { workflowId: 'wf-123' });

      expect(result.deployedState).toBeDefined();
      expect(mockClient.getDeployedWorkflowState).toHaveBeenCalledWith('wf-123');
    });
  });

  describe('deployWorkflow', () => {
    it('should return concise deployment details', async () => {
      const mockClient = createMockSimApiClient();

      const result = await deployWorkflow(mockClient, { workflowId: 'wf-123' });

      expect(result.isDeployed).toBe(true);
      expect(result.apiKey).toBe('Workspace API keys');
      expect(mockClient.deployWorkflow).toHaveBeenCalledWith('wf-123');
    });
  });

  describe('deployment versions', () => {
    it('should list concise deployment versions', async () => {
      const mockClient = createMockSimApiClient();

      const result = await listDeploymentVersions(mockClient, { workflowId: 'wf-123' });

      expect(result.workflowId).toBe('wf-123');
      expect(result.versions[0]).toEqual({
        version: 3,
        name: 'Current active deployment',
        description: 'Latest deployed state',
        isActive: true,
        createdAt: '2024-01-16T12:00:00.000Z',
        deployedBy: 'Admin',
      });
      expect(mockClient.listDeploymentVersions).toHaveBeenCalledWith('wf-123');
    });

    it('should preserve workflow-level 404s when listing deployment versions', async () => {
      const mockClient = createMockSimApiClient({
        listDeploymentVersions: async () => {
          throw new NotFoundError('Workflow', 'wf-missing');
        },
      });

      await expect(
        listDeploymentVersions(mockClient, { workflowId: 'wf-missing' })
      ).rejects.toThrow('Workflow not found: wf-missing');
    });

    it('should get version summary without deployed state by default', async () => {
      const mockClient = createMockSimApiClient();

      const result = await getDeploymentVersion(mockClient, {
        workflowId: 'wf-123',
        version: 3,
      });

      expect(result.workflowId).toBe('wf-123');
      expect(result.version.version).toBe(3);
      expect(result.deployedState).toBeUndefined();
      expect(mockClient.listDeploymentVersions).toHaveBeenCalledWith('wf-123');
      expect(mockClient.getDeploymentVersion).not.toHaveBeenCalled();
    });

    it('should include deployed state only when requested', async () => {
      const mockClient = createMockSimApiClient();

      const result = await getDeploymentVersion(mockClient, {
        workflowId: 'wf-123',
        version: 3,
        includeState: true,
      });

      expect(result.deployedState).toEqual(mockDeploymentVersionStateResult.deployedState);
      expect(mockClient.getDeploymentVersion).toHaveBeenCalledWith('wf-123', 3);
    });

    it('should preserve workflow-level 404s during deployment version lookup', async () => {
      const mockClient = createMockSimApiClient({
        listDeploymentVersions: async () => {
          throw new NotFoundError('Workflow', 'wf-missing');
        },
      });

      await expect(
        getDeploymentVersion(mockClient, { workflowId: 'wf-missing', version: 3 })
      ).rejects.toThrow('Workflow not found: wf-missing');
    });

    it('should map state-fetch 404s to deployment-version-not-found after version validation', async () => {
      const mockClient = createMockSimApiClient({
        getDeploymentVersion: async () => {
          throw new SimApiError('deployment version missing', 404, SimErrorCode.NOT_FOUND, {
            resource: 'DeploymentVersion',
            id: '3',
          });
        },
      });

      await expect(
        getDeploymentVersion(mockClient, { workflowId: 'wf-123', version: 3, includeState: true })
      ).rejects.toThrow('could not find that deployment version');
    });

    it('should fail before any API call when workflowId is missing', async () => {
      const mockClient = createMockSimApiClient();

      await expect(
        getDeploymentVersion(mockClient, { workflowId: '', version: 3 })
      ).rejects.toThrow("Missing required parameter 'workflowId'");
      expect(mockClient.listDeploymentVersions).not.toHaveBeenCalled();
    });

    it('should fail before any API call when version is missing', async () => {
      const mockClient = createMockSimApiClient();

      await expect(
        getDeploymentVersion(mockClient, { workflowId: 'wf-123', version: undefined as never })
      ).rejects.toThrow("Missing required parameter 'version'");
      expect(mockClient.listDeploymentVersions).not.toHaveBeenCalled();
    });

    it('should reject non-numeric deployment version input with next-step hint', async () => {
      const mockClient = createMockSimApiClient();

      await expect(
        getDeploymentVersion(mockClient, { workflowId: 'wf-123', version: 'abc' as never })
      ).rejects.toThrow('Call list_deployment_versions first');
      expect(mockClient.listDeploymentVersions).not.toHaveBeenCalled();
    });

    it('should activate deployment version with concise response', async () => {
      const mockClient = createMockSimApiClient();

      const result = await activateDeploymentVersion(mockClient, {
        workflowId: 'wf-123',
        version: 3,
      });

      expect(result).toEqual({
        success: true,
        workflowId: 'wf-123',
        version: 3,
        deployedAt: mockActivateDeploymentVersionResult.deployedAt,
        warnings: mockActivateDeploymentVersionResult.warnings,
      });
      expect(mockClient.activateDeploymentVersion).toHaveBeenCalledWith('wf-123', 3);
    });

    it('should map missing deployment versions during activation to not-found error', async () => {
      const mockClient = createMockSimApiClient({
        activateDeploymentVersion: async () => {
          throw new NotFoundError('Resource', 'unknown');
        },
      });

      await expect(
        activateDeploymentVersion(mockClient, { workflowId: 'wf-123', version: 99 })
      ).rejects.toThrow('could not find that deployment version');
    });

    it('should preserve workflow-level 404s during activation', async () => {
      const mockClient = createMockSimApiClient({
        activateDeploymentVersion: async () => {
          throw new NotFoundError('Workflow', 'wf-missing');
        },
      });

      await expect(
        activateDeploymentVersion(mockClient, { workflowId: 'wf-missing', version: 3 })
      ).rejects.toThrow('Workflow not found: wf-missing');
    });

    it('should return concise revert response', async () => {
      const mockClient = createMockSimApiClient();

      const result = await revertWorkflowToDeploymentVersion(mockClient, {
        workflowId: 'wf-123',
        version: 2,
      });

      expect(result).toEqual({
        success: true,
        workflowId: 'wf-123',
        version: 2,
        lastSaved: mockRevertDeploymentVersionResult.lastSaved,
      });
      expect(mockClient.revertWorkflowToDeploymentVersion).toHaveBeenCalledWith('wf-123', 2);
    });

    it('should surface permission errors distinctly for mutation tools', async () => {
      const mockClient = createMockSimApiClient({
        revertWorkflowToDeploymentVersion: async () => {
          const error = new Error('Forbidden');
          Object.assign(error, { statusCode: 403 });
          throw error;
        },
      });

      await expect(
        revertWorkflowToDeploymentVersion(mockClient, { workflowId: 'wf-123', version: 2 })
      ).rejects.toThrow('requires additional workflow permissions');
    });

    it('should preserve workflow-level 404s during revert', async () => {
      const mockClient = createMockSimApiClient({
        revertWorkflowToDeploymentVersion: async () => {
          throw new NotFoundError('Workflow', 'wf-missing');
        },
      });

      await expect(
        revertWorkflowToDeploymentVersion(mockClient, { workflowId: 'wf-missing', version: 2 })
      ).rejects.toThrow('Workflow not found: wf-missing');
    });
  });

  describe('execution controls', () => {
    it('should run workflow until a block', async () => {
      const mockClient = createMockSimApiClient();

      const result = await runWorkflowUntilBlock(mockClient, {
        workflowId: 'wf-123',
        stopAfterBlockId: 'block-2',
        input: { message: 'hello' },
      });

      expect(result).toMatchObject({
        success: true,
        executionId: 'exec-abc123',
        stopAfterBlockId: 'block-2',
      });
      expect(mockClient.executeWorkflow).toHaveBeenCalledWith('wf-123', {
        input: { message: 'hello' },
        triggerType: undefined,
        useDraftState: true,
        stopAfterBlockId: 'block-2',
      });
    });

    it('should run from a block using latest snapshot by default', async () => {
      const mockClient = createMockSimApiClient();

      const result = await runFromBlock(mockClient, {
        workflowId: 'wf-123',
        startBlockId: 'block-2',
      });

      expect(result).toMatchObject({
        success: true,
        executionId: 'exec-abc123',
        startBlockId: 'block-2',
      });
      expect(mockClient.executeWorkflow).toHaveBeenCalledWith('wf-123', {
        input: undefined,
        triggerType: undefined,
        useDraftState: true,
        runFromBlock: {
          startBlockId: 'block-2',
          executionId: 'latest',
        },
      });
    });

    it('should preserve raw object payloads for run-from-block responses', async () => {
      const rawPayload = {
        executionId: 'exec-raw-object',
        status: 'paused',
        snapshotId: 'snap-123',
      };
      const mockClient = createMockSimApiClient({
        executeWorkflow: async () => rawPayload as never,
      });

      const result = await runFromBlock(mockClient, {
        workflowId: 'wf-123',
        startBlockId: 'block-2',
      });

      expect(result).toEqual({
        success: true,
        executionId: undefined,
        startBlockId: 'block-2',
        output: rawPayload,
        error: undefined,
        metadata: undefined,
      });
    });

    it('should preserve raw error objects as output for partial execution tools', async () => {
      const rawPayload = { error: 'backend debug payload' };
      const mockClient = createMockSimApiClient({
        executeWorkflow: async () => rawPayload as never,
      });

      const result = await runFromBlock(mockClient, {
        workflowId: 'wf-123',
        startBlockId: 'block-2',
      });

      expect(result).toEqual({
        success: true,
        executionId: undefined,
        startBlockId: 'block-2',
        output: rawPayload,
        error: undefined,
        metadata: undefined,
      });
    });

    it('should preserve raw metadata objects as output for partial execution tools', async () => {
      const rawPayload = { metadata: { note: 'partial state only' } };
      const mockClient = createMockSimApiClient({
        executeWorkflow: async () => rawPayload as never,
      });

      const result = await runBlock(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-2',
      });

      expect(result).toEqual({
        success: true,
        executionId: undefined,
        blockId: 'block-2',
        output: rawPayload,
        error: undefined,
        metadata: undefined,
      });
    });

    it('should preserve raw array payloads as output for partial execution tools', async () => {
      const rawPayload = ['step-1', { status: 'paused' }];
      const mockClient = createMockSimApiClient({
        executeWorkflow: async () => rawPayload as never,
      });

      const result = await runWorkflowUntilBlock(mockClient, {
        workflowId: 'wf-123',
        stopAfterBlockId: 'block-2',
      });

      expect(result).toEqual({
        success: true,
        executionId: undefined,
        stopAfterBlockId: 'block-2',
        output: rawPayload,
        error: undefined,
        metadata: undefined,
      });
    });

    it('should run a single block using thin wrapper controls', async () => {
      const mockClient = createMockSimApiClient();

      const result = await runBlock(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-2',
        executionId: 'exec-prev',
      });

      expect(result).toMatchObject({
        success: true,
        executionId: 'exec-abc123',
        blockId: 'block-2',
      });
      expect(mockClient.executeWorkflow).toHaveBeenCalledWith('wf-123', {
        input: undefined,
        triggerType: undefined,
        useDraftState: true,
        stopAfterBlockId: 'block-2',
        runFromBlock: {
          startBlockId: 'block-2',
          executionId: 'exec-prev',
        },
      });
    });

    it('should wrap raw string payloads for run-block responses', async () => {
      const mockClient = createMockSimApiClient({
        executeWorkflow: async () => 'raw execution payload' as never,
      });

      const result = await runBlock(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-2',
      });

      expect(result).toEqual({
        success: true,
        executionId: undefined,
        blockId: 'block-2',
        output: 'raw execution payload',
        error: undefined,
        metadata: undefined,
      });
    });

    it('should wrap raw primitive payloads for run-until-block responses', async () => {
      const mockClient = createMockSimApiClient({
        executeWorkflow: async () => 42 as never,
      });

      const result = await runWorkflowUntilBlock(mockClient, {
        workflowId: 'wf-123',
        stopAfterBlockId: 'block-2',
      });

      expect(result).toEqual({
        success: true,
        executionId: undefined,
        stopAfterBlockId: 'block-2',
        output: 42,
        error: undefined,
        metadata: undefined,
      });
    });

    it('should surface missing snapshot failures clearly', async () => {
      const mockClient = createMockSimApiClient({
        executeWorkflow: async () => {
          throw new ValidationError(
            'No execution state found for workflow wf-123. Run the full workflow first.'
          );
        },
      });

      await expect(
        runFromBlock(mockClient, {
          workflowId: 'wf-123',
          startBlockId: 'block-2',
        })
      ).rejects.toThrow('Run the full workflow first');
    });

    it('should require execution control IDs', async () => {
      const mockClient = createMockSimApiClient();

      await expect(
        runBlock(mockClient, {
          workflowId: 'wf-123',
          blockId: '',
        })
      ).rejects.toThrow("Missing required parameter 'blockId'");
    });

    it('should map missing executions during cancellation', async () => {
      const mockClient = createMockSimApiClient({
        cancelExecution: async () => {
          throw new NotFoundError('Execution', 'exec-missing');
        },
      });

      await expect(
        cancelExecution(mockClient, {
          workflowId: 'wf-123',
          executionId: 'exec-missing',
        })
      ).rejects.toThrow('Execution not found: exec-missing');
    });

    it('should not misclassify workflow 404s as execution 404s when executionId is present', async () => {
      const mockClient = createMockSimApiClient({
        cancelExecution: async () => {
          throw new NotFoundError('Workflow', 'wf-missing');
        },
      });

      await expect(
        cancelExecution(mockClient, {
          workflowId: 'wf-missing',
          executionId: 'exec-abc123',
        })
      ).rejects.toThrow('Workflow not found: wf-missing');
    });

    it('should cancel execution successfully', async () => {
      const mockClient = createMockSimApiClient();

      const result = await cancelExecution(mockClient, {
        workflowId: 'wf-123',
        executionId: 'exec-abc123',
      });

      expect(result).toEqual(mockCancelExecutionResult);
      expect(mockClient.cancelExecution).toHaveBeenCalledWith('wf-123', 'exec-abc123');
    });
  });

  describe('undeployWorkflow', () => {
    it('should return concise undeploy details', async () => {
      const mockClient = createMockSimApiClient();

      const result = await undeployWorkflow(mockClient, { workflowId: 'wf-123' });

      expect(result.isDeployed).toBe(false);
      expect(result.apiKey).toBeNull();
      expect(mockClient.undeployWorkflow).toHaveBeenCalledWith('wf-123');
    });
  });

  describe('execution logs', () => {
    it('should return summary-first execution logs output', async () => {
      const mockClient = createMockSimApiClient();

      const result = await getExecutionLogs(mockClient, {
        workspaceId: 'ws-789',
      });

      expect(result).toEqual({
        count: 1,
        data: mockExecutionLogs.data,
        nextCursor: mockExecutionLogs.nextCursor,
        limits: mockExecutionLogs.limits,
      });
      expect(mockClient.getLogs).toHaveBeenCalledWith({ workspaceId: 'ws-789' });
    });

    it('should reject trace span flags without full details', async () => {
      const mockClient = createMockSimApiClient();

      await expect(
        getExecutionLogs(mockClient, {
          workspaceId: 'ws-789',
          includeTraceSpans: true,
        })
      ).rejects.toThrow('require details="full"');
    });

    it('should return log detail with lightweight summary', async () => {
      const mockClient = createMockSimApiClient();

      const result = await getExecutionLogDetail(mockClient, { logId: 'log-1' });

      expect(result.summary).toEqual({
        id: 'log-1',
        workflowId: 'wf-123',
        executionId: 'exec-abc123',
        level: 'info',
        trigger: 'api',
        startedAt: '2024-01-15T10:00:00.000Z',
        endedAt: '2024-01-15T10:00:05.000Z',
        totalDurationMs: 5000,
      });
      expect(result.data).toEqual(mockExecutionLogDetail.data);
      expect(result.limits).toEqual(mockExecutionLogDetail.limits);
    });

    it('should map missing log detail to descriptive not found error', async () => {
      const mockClient = createMockSimApiClient({
        getLogDetail: async () => {
          throw new NotFoundError('Resource', 'log-missing');
        },
      });

      await expect(getExecutionLogDetail(mockClient, { logId: 'log-missing' })).rejects.toThrow(
        'Execution log not found: log-missing'
      );
    });
  });

  describe('deleteWorkflow', () => {
    it('should return template summary when checkTemplates=true', async () => {
      const mockClient = createMockSimApiClient();

      const result = await deleteWorkflow(mockClient, {
        workflowId: 'wf-123',
        checkTemplates: true,
      });

      expect(result).toEqual({
        success: true,
        workflowId: 'wf-123',
        checkOnly: true,
        ...mockWorkflowDeleteCheckResult,
      });
    });

    it('should require templateAction when published templates exist', async () => {
      const mockClient = createMockSimApiClient();

      await expect(deleteWorkflow(mockClient, { workflowId: 'wf-123' })).rejects.toThrow(
        'templateAction'
      );
    });

    it('should delete workflow when templateAction is provided', async () => {
      const mockClient = createMockSimApiClient();

      const result = await deleteWorkflow(mockClient, {
        workflowId: 'wf-123',
        templateAction: 'orphan',
      });

      expect(result).toEqual({
        success: true,
        workflowId: 'wf-123',
        deleted: true,
        templateAction: 'orphan',
      });
      expect(mockClient.deleteWorkflow).toHaveBeenLastCalledWith({
        workflowId: 'wf-123',
        templateAction: 'orphan',
      });
    });
  });
});
describe('Workflow Tool Error Handling', () => {
  it('should handle authentication errors consistently', async () => {
    const mockClient = createMockSimApiClient({
      listWorkflows: async () => {
        throw new Error('Invalid API key');
      },
    });

    await expect(listWorkflows(mockClient, {})).rejects.toThrow('Invalid API key');
  });

  it('should handle network errors', async () => {
    const mockClient = createMockSimApiClient({
      getWorkflow: async () => {
        throw new Error('Network error');
      },
    });

    await expect(getWorkflow(mockClient, { workflowId: 'wf-123' })).rejects.toThrow(
      'Network error'
    );
  });
});
