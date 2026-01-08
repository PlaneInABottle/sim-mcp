/**
 * Workflow Tools Unit Tests
 *
 * Comprehensive tests for all workflow tools including new operation-based tools.
 * Uses mocked SimApiClient to isolate tool logic.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  deleteWorkflow,
  executeWorkflow,
  exportWorkflow,
  getWorkflow,
  importWorkflow,
  listWorkflows,
  replaceWorkflowState,
} from '../../../src/tools/workflow/index.js';
import { createMockSimApiClient, mockDeployedWorkflow, mockWorkflow } from '../../mocks/sim-api.js';

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

  describe('deleteWorkflow', () => {
    it('should return success on deletion', async () => {
      const mockClient = createMockSimApiClient();

      const result = await deleteWorkflow(mockClient, { workflowId: 'wf-123' });

      expect(result.success).toBe(true);
    });

    it('should call client with correct workflowId', async () => {
      const mockClient = createMockSimApiClient();

      await deleteWorkflow(mockClient, { workflowId: 'wf-to-delete' });

      expect(mockClient.deleteWorkflow).toHaveBeenCalledWith('wf-to-delete');
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        deleteWorkflow: async () => {
          throw new Error('Permission denied');
        },
      });

      await expect(deleteWorkflow(mockClient, { workflowId: 'wf-123' })).rejects.toThrow(
        'Permission denied'
      );
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow without input', async () => {
      const mockClient = createMockSimApiClient();

      const result = await executeWorkflow(mockClient, { workflowId: 'wf-deployed' });

      expect(result.executionId).toBe('exec-abc123');
      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ result: 'success', data: { message: 'Hello World' } });
    });

    it('should execute workflow with input', async () => {
      const mockClient = createMockSimApiClient();

      await executeWorkflow(mockClient, {
        workflowId: 'wf-123',
        input: { name: 'John', age: 30 },
      });

      expect(mockClient.executeWorkflow).toHaveBeenCalledWith('wf-123', { name: 'John', age: 30 });
    });

    it('should propagate execution errors', async () => {
      const mockClient = createMockSimApiClient({
        executeWorkflow: async () => {
          throw new Error('Execution failed');
        },
      });

      await expect(executeWorkflow(mockClient, { workflowId: 'wf-123' })).rejects.toThrow(
        'Execution failed'
      );
    });
  });

  describe('exportWorkflow', () => {
    it('should return export payload', async () => {
      const mockClient = createMockSimApiClient();

      const result = await exportWorkflow(mockClient, { workflowId: 'wf-123' });

      expect(result.export).toBeDefined();
      expect(result.export.version).toBe('1.0.0');
      expect(result.export.workflow.id).toBe('wf-123');
    });

    it('should call client with correct workflowId', async () => {
      const mockClient = createMockSimApiClient();

      await exportWorkflow(mockClient, { workflowId: 'wf-test-id' });

      expect(mockClient.exportWorkflow).toHaveBeenCalledWith('wf-test-id');
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        exportWorkflow: async () => {
          throw new Error('Export failed');
        },
      });

      await expect(exportWorkflow(mockClient, { workflowId: 'wf-123' })).rejects.toThrow(
        'Export failed'
      );
    });
  });

  describe('importWorkflow', () => {
    it('should return import result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await importWorkflow(mockClient, {
        workspaceId: 'ws-123',
        workflow: { blocks: {}, edges: [], loops: {}, parallels: {} },
      });

      expect(result.success).toBe(true);
      expect(result.workflowId).toBe('wf-new-123');
      expect(result.name).toBe('Imported Workflow');
    });

    it('should pass all parameters to client', async () => {
      const mockClient = createMockSimApiClient();
      const workflowData = { blocks: {}, edges: [], loops: {}, parallels: {} };

      await importWorkflow(mockClient, {
        workspaceId: 'ws-123',
        folderId: 'folder-456',
        name: 'My Workflow',
        workflow: workflowData,
      });

      expect(mockClient.importWorkflow).toHaveBeenCalledWith({
        workspaceId: 'ws-123',
        folderId: 'folder-456',
        name: 'My Workflow',
        workflow: workflowData,
      });
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        importWorkflow: async () => {
          throw new Error('Import failed');
        },
      });

      await expect(
        importWorkflow(mockClient, {
          workspaceId: 'ws-123',
          workflow: { blocks: {}, edges: [], loops: {}, parallels: {} },
        })
      ).rejects.toThrow('Import failed');
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
