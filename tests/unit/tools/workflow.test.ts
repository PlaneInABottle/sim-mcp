/**
 * Workflow Tools Unit Tests
 *
 * Comprehensive tests for all workflow tools including new operation-based tools.
 * Uses mocked SimApiClient to isolate tool logic.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  deleteWorkflow,
  exportWorkflow,
  getWorkflow,
  importWorkflow,
  listWorkflows,
  replaceWorkflowState,
  stripBlockDetails,
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

    describe('lightweight mode (default)', () => {
      it('should return lightweight export by default (no verbose param)', async () => {
        const mockClient = createMockSimApiClient();

        const result = await exportWorkflow(mockClient, { workflowId: 'wf-123' });

        // Should have _lightweight marker
        expect((result.export as { _lightweight?: boolean })._lightweight).toBe(true);
      });

      it('should strip subBlocks from blocks in lightweight mode', async () => {
        const mockClient = createMockSimApiClient();

        const result = await exportWorkflow(mockClient, { workflowId: 'wf-123' });

        const blocks = result.export.state.blocks;
        const block = blocks['block-1'] as Record<string, unknown>;

        // Should NOT have subBlocks
        expect(block.subBlocks).toBeUndefined();
        // Should NOT have data
        expect(block.data).toBeUndefined();
        // Should keep essential fields
        expect(block.id).toBe('block-1');
        expect(block.type).toBe('agent');
        expect(block.name).toBe('AI Agent');
        expect(block.position).toEqual({ x: 100, y: 100 });
        expect(block.enabled).toBe(true);
        // Should keep outputs
        expect(block.outputs).toBeDefined();
      });

      it('should strip variable values in lightweight mode', async () => {
        const mockClient = createMockSimApiClient();

        const result = await exportWorkflow(mockClient, { workflowId: 'wf-123' });

        const variables = result.export.state.variables;
        expect(variables).toHaveLength(2);

        // Should have id, name, type but NOT value
        const firstVar = variables![0] as Record<string, unknown>;
        expect(firstVar.id).toBe('var-1');
        expect(firstVar.name).toBe('apiKey');
        expect(firstVar.type).toBe('string');
        expect(firstVar.value).toBeUndefined();
      });

      it('should keep edges intact in lightweight mode', async () => {
        const mockClient = createMockSimApiClient();

        const result = await exportWorkflow(mockClient, { workflowId: 'wf-123' });

        expect(result.export.state.edges).toHaveLength(1);
        expect(result.export.state.edges[0]).toEqual({
          id: 'edge-1',
          source: 'block-1',
          target: 'block-2',
          sourceHandle: 'output',
          targetHandle: 'input',
        });
      });

      it('should return lightweight export when verbose=false', async () => {
        const mockClient = createMockSimApiClient();

        const result = await exportWorkflow(mockClient, { workflowId: 'wf-123', verbose: false });

        expect((result.export as { _lightweight?: boolean })._lightweight).toBe(true);
      });
    });

    describe('verbose mode', () => {
      it('should return full export when verbose=true', async () => {
        const mockClient = createMockSimApiClient();

        const result = await exportWorkflow(mockClient, { workflowId: 'wf-123', verbose: true });

        // Should NOT have _lightweight marker
        expect((result.export as { _lightweight?: boolean })._lightweight).toBeUndefined();
      });

      it('should include subBlocks in verbose mode', async () => {
        const mockClient = createMockSimApiClient();

        const result = await exportWorkflow(mockClient, { workflowId: 'wf-123', verbose: true });

        const blocks = result.export.state.blocks;
        const block = blocks['block-1'] as Record<string, unknown>;

        // Should have subBlocks
        expect(block.subBlocks).toBeDefined();
        expect((block.subBlocks as Record<string, unknown>).model).toBeDefined();
      });

      it('should include data in verbose mode', async () => {
        const mockClient = createMockSimApiClient();

        const result = await exportWorkflow(mockClient, { workflowId: 'wf-123', verbose: true });

        const blocks = result.export.state.blocks;
        const block = blocks['block-1'] as Record<string, unknown>;

        // Should have data
        expect(block.data).toBeDefined();
        expect((block.data as Record<string, unknown>).config).toBeDefined();
      });

      it('should include variable values in verbose mode', async () => {
        const mockClient = createMockSimApiClient();

        const result = await exportWorkflow(mockClient, { workflowId: 'wf-123', verbose: true });

        const variables = result.export.state.variables;
        expect(variables).toHaveLength(2);

        // Should have value
        const firstVar = variables![0] as Record<string, unknown>;
        expect(firstVar.value).toBe('secret-key-123');
      });
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

describe('stripBlockDetails helper', () => {
  it('should keep essential fields', () => {
    const fullBlock = {
      id: 'block-1',
      type: 'agent',
      name: 'My Agent',
      position: { x: 100, y: 200 },
      enabled: true,
      outputs: { response: { type: 'string' } },
      subBlocks: { model: { value: 'gpt-4' } },
      data: { config: { temperature: 0.7 } },
    };

    const result = stripBlockDetails(fullBlock);

    expect(result.id).toBe('block-1');
    expect(result.type).toBe('agent');
    expect(result.name).toBe('My Agent');
    expect(result.position).toEqual({ x: 100, y: 200 });
    expect(result.enabled).toBe(true);
    expect(result.outputs).toEqual({ response: { type: 'string' } });
  });

  it('should remove subBlocks and data', () => {
    const fullBlock = {
      id: 'block-1',
      type: 'agent',
      name: 'My Agent',
      position: { x: 100, y: 200 },
      enabled: true,
      subBlocks: { model: { value: 'gpt-4' } },
      data: { config: { temperature: 0.7 } },
    };

    const result = stripBlockDetails(fullBlock);

    expect((result as Record<string, unknown>).subBlocks).toBeUndefined();
    expect((result as Record<string, unknown>).data).toBeUndefined();
  });

  it('should default enabled to true when not specified', () => {
    const blockWithoutEnabled = {
      id: 'block-1',
      type: 'agent',
      name: 'My Agent',
      position: { x: 100, y: 200 },
    };

    const result = stripBlockDetails(blockWithoutEnabled);

    expect(result.enabled).toBe(true);
  });

  it('should preserve enabled=false', () => {
    const disabledBlock = {
      id: 'block-1',
      type: 'agent',
      name: 'My Agent',
      position: { x: 100, y: 200 },
      enabled: false,
    };

    const result = stripBlockDetails(disabledBlock);

    expect(result.enabled).toBe(false);
  });

  it('should not include outputs if not present', () => {
    const blockWithoutOutputs = {
      id: 'block-1',
      type: 'agent',
      name: 'My Agent',
      position: { x: 100, y: 200 },
      enabled: true,
    };

    const result = stripBlockDetails(blockWithoutOutputs);

    expect(result.outputs).toBeUndefined();
  });
});
