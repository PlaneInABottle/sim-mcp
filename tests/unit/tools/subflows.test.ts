/**
 * Subflow Tools Unit Tests
 *
 * Tests for subflow tools including add, update, and remove operations.
 * Uses mocked SimApiClient to isolate tool logic.
 */

import { describe, expect, it, vi } from 'vitest';

import { addSubflow, removeSubflow, updateSubflow } from '../../../src/tools/subflows/index.js';
import { createMockSimApiClient } from '../../mocks/sim-api.js';

// Mock the logger to avoid output during tests
vi.mock('../../../src/utils/logger.js', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('Subflow Tools', () => {
  describe('addSubflow', () => {
    it('should add subflow and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await addSubflow(mockClient, {
        workflowId: 'wf-123',
        id: 'subflow-1',
        type: 'loop',
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('should pass config to client', async () => {
      const mockClient = createMockSimApiClient();

      await addSubflow(mockClient, {
        workflowId: 'wf-123',
        id: 'subflow-1',
        type: 'parallel',
        config: { maxConcurrency: 5 },
      });

      expect(mockClient.subflowOperation).toHaveBeenCalledWith(
        'wf-123',
        expect.objectContaining({
          id: 'subflow-1',
          type: 'parallel',
          config: { maxConcurrency: 5 },
        }),
        'add'
      );
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        subflowOperation: async () => {
          throw new Error('Add subflow failed');
        },
      });

      await expect(
        addSubflow(mockClient, {
          workflowId: 'wf-123',
          id: 'subflow-1',
          type: 'loop',
        })
      ).rejects.toThrow('Add subflow failed');
    });
  });

  describe('updateSubflow', () => {
    it('should update subflow and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await updateSubflow(mockClient, {
        workflowId: 'wf-123',
        id: 'subflow-1',
        type: 'parallel',
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('should call client with correct parameters', async () => {
      const mockClient = createMockSimApiClient();

      await updateSubflow(mockClient, {
        workflowId: 'wf-123',
        id: 'subflow-update',
        config: { iterations: 10 },
      });

      expect(mockClient.subflowOperation).toHaveBeenCalledWith(
        'wf-123',
        expect.objectContaining({
          id: 'subflow-update',
          config: { iterations: 10 },
        }),
        'update'
      );
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        subflowOperation: async () => {
          throw new Error('Subflow not found');
        },
      });

      await expect(
        updateSubflow(mockClient, {
          workflowId: 'wf-123',
          id: 'not-found',
        })
      ).rejects.toThrow('Subflow not found');
    });
  });

  describe('removeSubflow', () => {
    it('should remove subflow and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await removeSubflow(mockClient, {
        workflowId: 'wf-123',
        id: 'subflow-1',
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('should call client with correct parameters', async () => {
      const mockClient = createMockSimApiClient();

      await removeSubflow(mockClient, {
        workflowId: 'wf-123',
        id: 'subflow-to-remove',
      });

      expect(mockClient.subflowOperation).toHaveBeenCalledWith(
        'wf-123',
        expect.objectContaining({
          id: 'subflow-to-remove',
        }),
        'remove'
      );
    });

    it('should propagate API errors for subflow not found', async () => {
      const mockClient = createMockSimApiClient({
        subflowOperation: async () => {
          throw new Error('Subflow not found');
        },
      });

      await expect(
        removeSubflow(mockClient, {
          workflowId: 'wf-123',
          id: 'not-found',
        })
      ).rejects.toThrow('Subflow not found');
    });

    it('should propagate API errors for workflow not found', async () => {
      const mockClient = createMockSimApiClient({
        subflowOperation: async () => {
          throw new Error('Workflow not found');
        },
      });

      await expect(
        removeSubflow(mockClient, {
          workflowId: 'not-found',
          id: 'subflow-1',
        })
      ).rejects.toThrow('Workflow not found');
    });

    it('should propagate network errors', async () => {
      const mockClient = createMockSimApiClient({
        subflowOperation: async () => {
          throw new Error('Network error');
        },
      });

      await expect(
        removeSubflow(mockClient, {
          workflowId: 'wf-123',
          id: 'subflow-1',
        })
      ).rejects.toThrow('Network error');
    });
  });
});

describe('Subflow Tool Error Handling', () => {
  it('should handle workflow not found errors', async () => {
    const mockClient = createMockSimApiClient({
      subflowOperation: async () => {
        throw new Error('Workflow not found');
      },
    });

    await expect(
      addSubflow(mockClient, {
        workflowId: 'not-found',
        id: 'subflow-1',
        type: 'loop',
      })
    ).rejects.toThrow('Workflow not found');
  });

  it('should handle network errors consistently', async () => {
    const mockClient = createMockSimApiClient({
      subflowOperation: async () => {
        throw new Error('Network error');
      },
    });

    await expect(
      updateSubflow(mockClient, {
        workflowId: 'wf-123',
        id: 'subflow-1',
      })
    ).rejects.toThrow('Network error');
  });
});
