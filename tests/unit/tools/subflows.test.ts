/**
 * Subflow Tools Unit Tests
 *
 * Tests for subflow update operation. Subflows (loop/parallel) are created
 * via addBlocks with type 'loop' or 'parallel', then modified via updateSubflow.
 * Uses mocked SimApiClient to isolate tool logic.
 */

import { describe, expect, it, vi } from 'vitest';

import { updateSubflow } from '../../../src/tools/subflows/index.js';
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
  describe('updateSubflow', () => {
    it('should update existing subflow and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await updateSubflow(mockClient, {
        workflowId: 'wf-123',
        id: 'existing-loop-block',
        type: 'loop',
        config: { iterations: 10 },
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('should call client subflowOperation correctly', async () => {
      const mockClient = createMockSimApiClient();

      await updateSubflow(mockClient, {
        workflowId: 'wf-123',
        id: 'loop-block-1',
        type: 'loop',
        config: { iterations: 5, loopType: 'for' },
      });

      expect(mockClient.subflowOperation).toHaveBeenCalledWith(
        'wf-123',
        expect.objectContaining({
          id: 'loop-block-1',
          type: 'loop',
          config: { iterations: 5, loopType: 'for' },
        })
      );
    });

    it('should update parallel subflow type', async () => {
      const mockClient = createMockSimApiClient();

      await updateSubflow(mockClient, {
        workflowId: 'wf-123',
        id: 'parallel-block',
        type: 'parallel',
        config: { count: 3 },
      });

      expect(mockClient.subflowOperation).toHaveBeenCalledWith(
        'wf-123',
        expect.objectContaining({
          id: 'parallel-block',
          type: 'parallel',
          config: { count: 3 },
        })
      );
    });

    it('should allow updating without type (keeps existing)', async () => {
      const mockClient = createMockSimApiClient();

      await updateSubflow(mockClient, {
        workflowId: 'wf-123',
        id: 'subflow-1',
        config: { iterations: 15 },
      });

      expect(mockClient.subflowOperation).toHaveBeenCalledWith(
        'wf-123',
        expect.objectContaining({
          id: 'subflow-1',
          config: { iterations: 15 },
        })
      );
    });

    it('should propagate API errors when subflow not found', async () => {
      const mockClient = createMockSimApiClient({
        subflowOperation: async () => {
          throw new Error('Subflow not found in workflow');
        },
      });

      await expect(
        updateSubflow(mockClient, {
          workflowId: 'wf-123',
          id: 'non-existent',
          config: {},
        })
      ).rejects.toThrow('Subflow not found');
    });

    it('should propagate workflow not found errors', async () => {
      const mockClient = createMockSimApiClient({
        subflowOperation: async () => {
          throw new Error('Workflow not found');
        },
      });

      await expect(
        updateSubflow(mockClient, {
          workflowId: 'not-found',
          id: 'subflow-1',
          config: {},
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
        updateSubflow(mockClient, {
          workflowId: 'wf-123',
          id: 'subflow-1',
          config: {},
        })
      ).rejects.toThrow('Network error');
    });
  });
});
