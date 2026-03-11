/**
 * Workflow Tools Unit Tests
 *
 * Comprehensive tests for all workflow tools including new operation-based tools.
 * Uses mocked SimApiClient to isolate tool logic.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Block } from '../../../src/schemas/workflow.js';
import {
  deleteWorkflow,
  deployWorkflow,
  getDeployedWorkflowState,
  getWorkflow,
  getWorkflowStatus,
  listWorkflows,
  replaceWorkflowState,
  undeployWorkflow,
} from '../../../src/tools/workflow/index.js';
import {
  createMockSimApiClient,
  mockDeployedWorkflow,
  mockWorkflow,
  mockWorkflowDeleteCheckResult,
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

  describe('replaceWorkflowState', () => {
    it('should return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await replaceWorkflowState(mockClient, {
        workflowId: 'wf-123',
        state: { blocks: {}, edges: [], loops: {}, parallels: {} },
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('should call client with correct parameters', async () => {
      const mockClient = createMockSimApiClient();
      const stateData = { blocks: { 'block-1': {} }, edges: [], loops: {}, parallels: {} };

      await replaceWorkflowState(mockClient, {
        workflowId: 'wf-123',
        state: stateData,
      });

      expect(mockClient.replaceWorkflowState).toHaveBeenCalledWith('wf-123', stateData);
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        replaceWorkflowState: async () => {
          throw new Error('Replace failed');
        },
      });

      await expect(
        replaceWorkflowState(mockClient, {
          workflowId: 'wf-123',
          state: { blocks: {}, edges: [], loops: {}, parallels: {} },
        })
      ).rejects.toThrow('Replace failed');
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

  describe('undeployWorkflow', () => {
    it('should return concise undeploy details', async () => {
      const mockClient = createMockSimApiClient();

      const result = await undeployWorkflow(mockClient, { workflowId: 'wf-123' });

      expect(result.isDeployed).toBe(false);
      expect(result.apiKey).toBeNull();
      expect(mockClient.undeployWorkflow).toHaveBeenCalledWith('wf-123');
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
