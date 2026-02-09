/**
 * Custom Tools Unit Tests
 *
 * Tests for listCustomTools (lightweight metadata) and getCustomTool (full details).
 * Verifies the strip/filter pattern and error handling.
 */

import { describe, expect, it, vi } from 'vitest';

import { listCustomTools, stripCustomToolDetails } from '../../../src/tools/custom-tools/list.js';
import { getCustomTool } from '../../../src/tools/custom-tools/get.js';
import type { CustomTool } from '../../../src/schemas/custom-tools.js';
import {
  createMockSimApiClient,
  mockCustomTool,
  mockCustomToolNoDesc,
  mockCustomTools,
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

describe('Custom Tools', () => {
  // ─── stripCustomToolDetails ───────────────────────────────────────────

  describe('stripCustomToolDetails', () => {
    it('should extract id, title, name, and description from a custom tool', () => {
      const summary = stripCustomToolDetails(mockCustomTool);

      expect(summary).toEqual({
        id: 'ct-1',
        title: 'Weather Lookup',
        name: 'get_weather',
        description: 'Get weather for a city',
      });
    });

    it('should omit description when schema.function.description is undefined', () => {
      const summary = stripCustomToolDetails(mockCustomToolNoDesc);

      expect(summary).toEqual({
        id: 'ct-2',
        title: 'Database Query',
        name: 'run_query',
      });
      expect(summary).not.toHaveProperty('description');
    });

    it('should NOT include schema, code, workspaceId, userId, or timestamps', () => {
      const summary = stripCustomToolDetails(mockCustomTool) as Record<string, unknown>;

      expect(summary).not.toHaveProperty('schema');
      expect(summary).not.toHaveProperty('code');
      expect(summary).not.toHaveProperty('workspaceId');
      expect(summary).not.toHaveProperty('userId');
      expect(summary).not.toHaveProperty('createdAt');
      expect(summary).not.toHaveProperty('updatedAt');
    });

    it('should produce output ~95% smaller than input', () => {
      const inputSize = JSON.stringify(mockCustomTool).length;
      const outputSize = JSON.stringify(stripCustomToolDetails(mockCustomTool)).length;
      const reduction = 1 - outputSize / inputSize;

      // The stripped output should be significantly smaller (at least 70% reduction)
      expect(reduction).toBeGreaterThan(0.7);
    });
  });

  // ─── listCustomTools ─────────────────────────────────────────────────

  describe('listCustomTools', () => {
    it('should return lightweight metadata for all tools', async () => {
      const mockClient = createMockSimApiClient();

      const result = await listCustomTools(mockClient, { workspaceId: 'ws-789' });

      expect(result.tools).toHaveLength(2);
      expect(result.tools[0]).toEqual({
        id: 'ct-1',
        title: 'Weather Lookup',
        name: 'get_weather',
        description: 'Get weather for a city',
      });
      expect(result.tools[1]).toEqual({
        id: 'ct-2',
        title: 'Database Query',
        name: 'run_query',
      });
    });

    it('should NOT include schema or code in output', async () => {
      const mockClient = createMockSimApiClient();

      const result = await listCustomTools(mockClient, { workspaceId: 'ws-789' });

      for (const tool of result.tools) {
        const toolObj = tool as Record<string, unknown>;
        expect(toolObj).not.toHaveProperty('schema');
        expect(toolObj).not.toHaveProperty('code');
        expect(toolObj).not.toHaveProperty('workspaceId');
        expect(toolObj).not.toHaveProperty('userId');
        expect(toolObj).not.toHaveProperty('createdAt');
        expect(toolObj).not.toHaveProperty('updatedAt');
      }
    });

    it('should handle empty tools list', async () => {
      const mockClient = createMockSimApiClient({
        listCustomTools: async () => [],
      });

      const result = await listCustomTools(mockClient, { workspaceId: 'ws-789' });

      expect(result.tools).toEqual([]);
    });

    it('should pass workspaceId to API client', async () => {
      const mockClient = createMockSimApiClient();

      await listCustomTools(mockClient, { workspaceId: 'ws-test-123' });

      expect(mockClient.listCustomTools).toHaveBeenCalledWith({
        workspaceId: 'ws-test-123',
        workflowId: undefined,
      });
    });

    it('should pass workflowId to API client', async () => {
      const mockClient = createMockSimApiClient();

      await listCustomTools(mockClient, { workflowId: 'wf-test-456' });

      expect(mockClient.listCustomTools).toHaveBeenCalledWith({
        workspaceId: undefined,
        workflowId: 'wf-test-456',
      });
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        listCustomTools: async () => {
          throw new Error('Network timeout');
        },
      });

      await expect(
        listCustomTools(mockClient, { workspaceId: 'ws-789' })
      ).rejects.toThrow('Network timeout');
    });
  });

  // ─── getCustomTool ────────────────────────────────────────────────────

  describe('getCustomTool', () => {
    it('should return full tool when found by ID', async () => {
      const mockClient = createMockSimApiClient();

      const result = await getCustomTool(mockClient, {
        workspaceId: 'ws-789',
        toolId: 'ct-1',
      });

      expect(result.tool).toBeDefined();
      expect(result.tool.id).toBe('ct-1');
      expect(result.tool.title).toBe('Weather Lookup');
      // Full details should be present
      expect(result.tool.schema).toBeDefined();
      expect(result.tool.schema.function.name).toBe('get_weather');
      expect(result.tool.code).toBeDefined();
      expect(result.tool.code).toContain('getWeather');
    });

    it('should return full schema and code (not stripped)', async () => {
      const mockClient = createMockSimApiClient();

      const result = await getCustomTool(mockClient, {
        workspaceId: 'ws-789',
        toolId: 'ct-1',
      });

      // Verify schema has full structure
      expect(result.tool.schema.type).toBe('function');
      expect(result.tool.schema.function.parameters).toBeDefined();
      expect(result.tool.schema.function.parameters.properties).toHaveProperty('city');

      // Verify metadata fields are present
      expect(result.tool.workspaceId).toBe('ws-789');
      expect(result.tool.userId).toBe('user-456');
      expect(result.tool.createdAt).toBeDefined();
      expect(result.tool.updatedAt).toBeDefined();
    });

    it('should find the second tool by ID', async () => {
      const mockClient = createMockSimApiClient();

      const result = await getCustomTool(mockClient, {
        workspaceId: 'ws-789',
        toolId: 'ct-2',
      });

      expect(result.tool.id).toBe('ct-2');
      expect(result.tool.title).toBe('Database Query');
      expect(result.tool.schema.function.name).toBe('run_query');
    });

    it('should throw error when tool not found', async () => {
      const mockClient = createMockSimApiClient();

      await expect(
        getCustomTool(mockClient, {
          workspaceId: 'ws-789',
          toolId: 'non-existent-tool',
        })
      ).rejects.toThrow("Custom tool with ID 'non-existent-tool' not found");
    });

    it('should throw descriptive error with the tool ID in message', async () => {
      const mockClient = createMockSimApiClient();

      try {
        await getCustomTool(mockClient, {
          workspaceId: 'ws-789',
          toolId: 'ct-missing-xyz',
        });
        // Should not reach here
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('ct-missing-xyz');
      }
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        listCustomTools: async () => {
          throw new Error('Unauthorized');
        },
      });

      await expect(
        getCustomTool(mockClient, { workspaceId: 'ws-789', toolId: 'ct-1' })
      ).rejects.toThrow('Unauthorized');
    });

    it('should pass workspaceId and workflowId to API client', async () => {
      const mockClient = createMockSimApiClient();

      await getCustomTool(mockClient, {
        workspaceId: 'ws-test',
        workflowId: 'wf-test',
        toolId: 'ct-1',
      });

      expect(mockClient.listCustomTools).toHaveBeenCalledWith({
        workspaceId: 'ws-test',
        workflowId: 'wf-test',
      });
    });
  });

  // ─── Integration: list → get workflow ─────────────────────────────────

  describe('list → get workflow', () => {
    it('should strip details in list but preserve them in get', async () => {
      const mockClient = createMockSimApiClient();

      // List returns stripped data
      const listResult = await listCustomTools(mockClient, { workspaceId: 'ws-789' });
      const listedTool = listResult.tools[0] as Record<string, unknown>;
      expect(listedTool).not.toHaveProperty('schema');
      expect(listedTool).not.toHaveProperty('code');

      // Get returns full data
      const getResult = await getCustomTool(mockClient, {
        workspaceId: 'ws-789',
        toolId: 'ct-1',
      });
      expect(getResult.tool.schema).toBeDefined();
      expect(getResult.tool.code).toBeDefined();
    });

    it('should produce significantly smaller list output than full tools', async () => {
      const mockClient = createMockSimApiClient();

      const listResult = await listCustomTools(mockClient, { workspaceId: 'ws-789' });
      const getResult = await getCustomTool(mockClient, {
        workspaceId: 'ws-789',
        toolId: 'ct-1',
      });

      const listSize = JSON.stringify(listResult.tools[0]).length;
      const getSize = JSON.stringify(getResult.tool).length;

      // List output should be much smaller than full tool
      expect(listSize).toBeLessThan(getSize);
      expect(listSize / getSize).toBeLessThan(0.3); // At least 70% reduction
    });
  });
});
