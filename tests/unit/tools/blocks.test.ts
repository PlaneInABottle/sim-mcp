/**
 * Block Tools Unit Tests
 *
 * Tests for operation-based block tools.
 * Uses mocked SimApiClient to isolate tool logic.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  addBlocks,
  removeBlocks,
  toggleBlockEnabled,
  updateBlockName,
  updateBlockPosition,
  updateSubblock,
} from '../../../src/tools/blocks/index.js';
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

describe('Block Operation Tools', () => {
  describe('addBlocks', () => {
    it('should add blocks and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await addBlocks(mockClient, {
        workflowId: 'wf-123',
        blocks: [{ type: 'agent', name: 'Test Agent', position: { x: 100, y: 100 } }],
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
      expect(result.blocksAdded).toBe(1);
    });

    it('should add multiple blocks', async () => {
      const mockClient = createMockSimApiClient();

      const result = await addBlocks(mockClient, {
        workflowId: 'wf-123',
        blocks: [
          { type: 'agent', name: 'Agent 1', position: { x: 100, y: 100 } },
          { type: 'http', name: 'HTTP Block', position: { x: 300, y: 100 } },
          { type: 'condition', name: 'Condition', position: { x: 200, y: 200 } },
        ],
      });

      expect(result.blocksAdded).toBe(3);
    });

    it('should add blocks with edges', async () => {
      const mockClient = createMockSimApiClient();

      await addBlocks(mockClient, {
        workflowId: 'wf-123',
        blocks: [
          { id: 'block-1', type: 'agent', name: 'Agent', position: { x: 100, y: 100 } },
          { id: 'block-2', type: 'http', name: 'HTTP', position: { x: 300, y: 100 } },
        ],
        edges: [{ id: 'e-1', source: 'block-1', target: 'block-2' }],
      });

      expect(mockClient.addBlocks).toHaveBeenCalledWith(
        'wf-123',
        expect.arrayContaining([
          expect.objectContaining({ id: 'block-1', type: 'agent' }),
          expect.objectContaining({ id: 'block-2', type: 'http' }),
        ]),
        [{ id: 'e-1', source: 'block-1', target: 'block-2' }],
        expect.any(Object)
      );
    });

    it('should auto-generate block IDs if not provided', async () => {
      const mockClient = createMockSimApiClient();

      await addBlocks(mockClient, {
        workflowId: 'wf-123',
        blocks: [{ type: 'agent', name: 'Agent', position: { x: 100, y: 100 } }],
      });

      expect(mockClient.addBlocks).toHaveBeenCalledWith(
        'wf-123',
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringContaining('block-'),
            type: 'agent',
          }),
        ]),
        undefined,
        expect.any(Object)
      );
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        addBlocks: async () => {
          throw new Error('Operation failed');
        },
      });

      await expect(
        addBlocks(mockClient, {
          workflowId: 'wf-123',
          blocks: [{ type: 'agent', name: 'Test', position: { x: 0, y: 0 } }],
        })
      ).rejects.toThrow('Operation failed');
    });
  });

  describe('removeBlocks', () => {
    it('should remove blocks and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await removeBlocks(mockClient, {
        workflowId: 'wf-123',
        blockIds: ['block-1', 'block-2'],
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
      expect(result.blocksRemoved).toBe(2);
    });

    it('should call client with correct parameters', async () => {
      const mockClient = createMockSimApiClient();

      await removeBlocks(mockClient, {
        workflowId: 'wf-123',
        blockIds: ['block-to-remove'],
      });

      expect(mockClient.removeBlocks).toHaveBeenCalledWith('wf-123', ['block-to-remove']);
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        removeBlocks: async () => {
          throw new Error('Block not found');
        },
      });

      await expect(
        removeBlocks(mockClient, { workflowId: 'wf-123', blockIds: ['not-found'] })
      ).rejects.toThrow('Block not found');
    });
  });

  describe('updateBlockName', () => {
    it('should update block name and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await updateBlockName(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-1',
        name: 'New Block Name',
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('should call client with correct parameters', async () => {
      const mockClient = createMockSimApiClient();

      await updateBlockName(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-1',
        name: 'Updated Name',
      });

      expect(mockClient.updateBlockName).toHaveBeenCalledWith('wf-123', 'block-1', 'Updated Name');
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        updateBlockName: async () => {
          throw new Error('Block not found');
        },
      });

      await expect(
        updateBlockName(mockClient, {
          workflowId: 'wf-123',
          blockId: 'not-found',
          name: 'Test',
        })
      ).rejects.toThrow('Block not found');
    });
  });

  describe('updateBlockPosition', () => {
    it('should update block position and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await updateBlockPosition(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-1',
        x: 200,
        y: 300,
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('should call client with correct parameters including commit', async () => {
      const mockClient = createMockSimApiClient();

      await updateBlockPosition(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-1',
        x: 150,
        y: 250,
        commit: true,
      });

      expect(mockClient.updateBlockPosition).toHaveBeenCalledWith(
        'wf-123',
        'block-1',
        { x: 150, y: 250 },
        true
      );
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        updateBlockPosition: async () => {
          throw new Error('Update failed');
        },
      });

      await expect(
        updateBlockPosition(mockClient, {
          workflowId: 'wf-123',
          blockId: 'block-1',
          x: 0,
          y: 0,
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('toggleBlockEnabled', () => {
    it('should toggle block enabled state and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await toggleBlockEnabled(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-1',
        enabled: false,
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('should call client with enabled=true', async () => {
      const mockClient = createMockSimApiClient();

      await toggleBlockEnabled(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-1',
        enabled: true,
      });

      expect(mockClient.toggleBlockEnabled).toHaveBeenCalledWith('wf-123', 'block-1', true);
    });

    it('should call client with enabled=false', async () => {
      const mockClient = createMockSimApiClient();

      await toggleBlockEnabled(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-1',
        enabled: false,
      });

      expect(mockClient.toggleBlockEnabled).toHaveBeenCalledWith('wf-123', 'block-1', false);
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        toggleBlockEnabled: async () => {
          throw new Error('Toggle failed');
        },
      });

      await expect(
        toggleBlockEnabled(mockClient, {
          workflowId: 'wf-123',
          blockId: 'block-1',
          enabled: true,
        })
      ).rejects.toThrow('Toggle failed');
    });
  });

  describe('updateSubblock', () => {
    it('should update subblock value and return operation result', async () => {
      const mockClient = createMockSimApiClient();

      const result = await updateSubblock(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-1',
        subblockId: 'subblock-1',
        value: 'new value',
      });

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('should call client.workflowOperation with correct parameters', async () => {
      const mockClient = createMockSimApiClient();

      await updateSubblock(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-1',
        subblockId: 'subblock-1',
        value: { nested: 'object' },
      });

      expect(mockClient.workflowOperation).toHaveBeenCalledWith(
        'wf-123',
        'subblock-update',
        'block',
        {
          blockId: 'block-1',
          subblockId: 'subblock-1',
          value: { nested: 'object' },
        }
      );
    });

    it('should handle different value types', async () => {
      const mockClient = createMockSimApiClient();

      // Test with string value
      await updateSubblock(mockClient, {
        workflowId: 'wf-123',
        blockId: 'block-1',
        subblockId: 'subblock-1',
        value: 'string value',
      });

      // Test with number value
      await updateSubblock(mockClient, {
        workflowId: 'wf-456',
        blockId: 'block-2',
        subblockId: 'subblock-2',
        value: 42,
      });

      // Test with boolean value
      await updateSubblock(mockClient, {
        workflowId: 'wf-789',
        blockId: 'block-3',
        subblockId: 'subblock-3',
        value: true,
      });

      expect(mockClient.workflowOperation).toHaveBeenCalledTimes(3);
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        workflowOperation: async () => {
          throw new Error('Subblock update failed');
        },
      });

      await expect(
        updateSubblock(mockClient, {
          workflowId: 'wf-123',
          blockId: 'block-1',
          subblockId: 'subblock-1',
          value: 'test',
        })
      ).rejects.toThrow('Subblock update failed');
    });
  });
});

describe('Block Tool Error Handling', () => {
  it('should handle network errors consistently', async () => {
    const mockClient = createMockSimApiClient({
      addBlocks: async () => {
        throw new Error('Network error');
      },
    });

    await expect(
      addBlocks(mockClient, {
        workflowId: 'wf-123',
        blocks: [{ type: 'test', name: 'Test', position: { x: 0, y: 0 } }],
      })
    ).rejects.toThrow('Network error');
  });
});
