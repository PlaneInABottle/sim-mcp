/**
 * Edge Tools Unit Tests
 *
 * Tests for operation-based edge tools.
 * Uses mocked SimApiClient to isolate tool logic.
 */

import { describe, expect, it, vi } from 'vitest';

import { addEdgeOp, removeEdgeOp } from '../../../src/tools/edges/index.js';
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

describe('Edge Operation Tools', () => {
  describe('addEdgeOp', () => {
    it('should add edge and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await addEdgeOp(mockClient, {
        workflowId: 'wf-123',
        source: 'block-1',
        target: 'block-2',
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
      expect(result.edgeId).toBeDefined();
    });

    it('should use provided edge ID', async () => {
      const mockClient = createMockSimApiClient();

      const result = await addEdgeOp(mockClient, {
        workflowId: 'wf-123',
        source: 'block-1',
        target: 'block-2',
        edgeId: 'custom-edge-id',
      });

      expect(result.edgeId).toBe('custom-edge-id');
    });

    it('should auto-generate edge ID if not provided', async () => {
      const mockClient = createMockSimApiClient();

      const result = await addEdgeOp(mockClient, {
        workflowId: 'wf-123',
        source: 'block-1',
        target: 'block-2',
      });

      expect(result.edgeId).toMatch(/^e-/);
    });

    it('should pass handles to client', async () => {
      const mockClient = createMockSimApiClient();

      await addEdgeOp(mockClient, {
        workflowId: 'wf-123',
        source: 'block-1',
        target: 'block-2',
        sourceHandle: 'output-1',
        targetHandle: 'input-1',
        edgeId: 'e-test',
      });

      expect(mockClient.addEdgeOperation).toHaveBeenCalledWith(
        'wf-123',
        expect.objectContaining({
          id: 'e-test',
          source: 'block-1',
          target: 'block-2',
          sourceHandle: 'output-1',
          targetHandle: 'input-1',
        })
      );
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        addEdgeOperation: async () => {
          throw new Error('Add edge failed');
        },
      });

      await expect(
        addEdgeOp(mockClient, {
          workflowId: 'wf-123',
          source: 'block-1',
          target: 'block-2',
        })
      ).rejects.toThrow('Add edge failed');
    });
  });

  describe('removeEdgeOp', () => {
    it('should remove edge and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await removeEdgeOp(mockClient, {
        workflowId: 'wf-123',
        edgeId: 'edge-1',
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('should call client with correct parameters', async () => {
      const mockClient = createMockSimApiClient();

      await removeEdgeOp(mockClient, {
        workflowId: 'wf-123',
        edgeId: 'edge-to-remove',
      });

      expect(mockClient.removeEdgeOperation).toHaveBeenCalledWith('wf-123', 'edge-to-remove');
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        removeEdgeOperation: async () => {
          throw new Error('Edge not found');
        },
      });

      await expect(
        removeEdgeOp(mockClient, { workflowId: 'wf-123', edgeId: 'not-found' })
      ).rejects.toThrow('Edge not found');
    });
  });
});

describe('Edge Tool Error Handling', () => {
  it('should handle workflow not found errors', async () => {
    const mockClient = createMockSimApiClient({
      addEdgeOperation: async () => {
        throw new Error('Workflow not found');
      },
    });

    await expect(
      addEdgeOp(mockClient, {
        workflowId: 'not-found',
        source: 'block-1',
        target: 'block-2',
      })
    ).rejects.toThrow('Workflow not found');
  });

  it('should handle network errors consistently', async () => {
    const mockClient = createMockSimApiClient({
      removeEdgeOperation: async () => {
        throw new Error('Network error');
      },
    });

    await expect(
      removeEdgeOp(mockClient, { workflowId: 'wf-123', edgeId: 'edge-1' })
    ).rejects.toThrow('Network error');
  });
});
