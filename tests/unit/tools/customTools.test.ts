/**
 * Custom Tools Unit Tests
 *
 * Tests for listCustomTools (lightweight metadata), getCustomTool (full details),
 * and upsertCustomTools (batch create/update with filtered response).
 * Verifies the strip/filter pattern and error handling.
 */

import { describe, expect, it, vi } from 'vitest';

import { listCustomTools, stripCustomToolDetails } from '../../../src/tools/custom-tools/list.js';
import { getCustomTool } from '../../../src/tools/custom-tools/get.js';
import {
  upsertCustomTools,
  filterUpsertedTools,
} from '../../../src/tools/custom-tools/upsert.js';
import type { CustomTool, CustomToolInput } from '../../../src/schemas/custom-tools.js';
import {
  createMockSimApiClient,
  mockCustomTool,
  mockCustomToolNoDesc,
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

    it('should require workspaceId or workflowId', async () => {
      const mockClient = createMockSimApiClient();

      await expect(listCustomTools(mockClient, {})).rejects.toThrow(
        "One of 'workspaceId', 'workflowId' is required for list_custom_tools"
      );
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

    it('should require workspaceId or workflowId', async () => {
      const mockClient = createMockSimApiClient();

      await expect(getCustomTool(mockClient, { toolId: 'ct-1' })).rejects.toThrow(
        "One of 'workspaceId', 'workflowId' is required for get_custom_tool"
      );
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

  // ─── filterUpsertedTools (pure function) ─────────────────────────────

  describe('filterUpsertedTools', () => {
    // Helper to create a CustomToolInput for testing
    const makeInput = (overrides: Partial<CustomToolInput> = {}): CustomToolInput => ({
      title: 'Test Tool',
      schema: {
        type: 'function',
        function: {
          name: 'test_func',
          parameters: { type: 'object', properties: {} },
        },
      },
      code: 'return true;',
      ...overrides,
    });

    // Helper to create a CustomTool (API response) for testing
    const makeTool = (overrides: Partial<CustomTool> = {}): CustomTool => ({
      id: 'ct-new',
      workspaceId: 'ws-789',
      userId: 'user-456',
      title: 'Test Tool',
      schema: {
        type: 'function',
        function: {
          name: 'test_func',
          parameters: { type: 'object', properties: {} },
        },
      },
      code: 'return true;',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      ...overrides,
    });

    it('should match updates by ID', () => {
      const inputTools: CustomToolInput[] = [
        makeInput({ id: 'ct-1', title: 'Updated Tool' }),
      ];
      const allTools: CustomTool[] = [
        makeTool({ id: 'ct-1' }),
        makeTool({ id: 'ct-other', schema: { type: 'function', function: { name: 'other_func', parameters: { type: 'object', properties: {} } } } }),
      ];

      const result = filterUpsertedTools(inputTools, allTools);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ct-1');
    });

    it('should match creates by schema.function.name', () => {
      const inputTools: CustomToolInput[] = [
        makeInput({ title: 'New Tool' }), // No id → create
      ];
      const allTools: CustomTool[] = [
        makeTool({ id: 'ct-existing', schema: { type: 'function', function: { name: 'existing_func', parameters: { type: 'object', properties: {} } } } }),
        makeTool({ id: 'ct-new-123', schema: { type: 'function', function: { name: 'test_func', parameters: { type: 'object', properties: {} } } } }),
      ];

      const result = filterUpsertedTools(inputTools, allTools);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ct-new-123');
      expect(result[0].schema.function.name).toBe('test_func');
    });

    it('should handle mixed create + update in same batch', () => {
      const inputTools: CustomToolInput[] = [
        makeInput({ id: 'ct-1', title: 'Updated Weather' }), // update
        makeInput({ title: 'Brand New', schema: { type: 'function', function: { name: 'brand_new_func', parameters: { type: 'object', properties: {} } } } }), // create
      ];
      const allTools: CustomTool[] = [
        makeTool({ id: 'ct-1', schema: { type: 'function', function: { name: 'get_weather', parameters: { type: 'object', properties: {} } } } }),
        makeTool({ id: 'ct-2', schema: { type: 'function', function: { name: 'run_query', parameters: { type: 'object', properties: {} } } } }),
        makeTool({ id: 'ct-3', schema: { type: 'function', function: { name: 'brand_new_func', parameters: { type: 'object', properties: {} } } } }),
      ];

      const result = filterUpsertedTools(inputTools, allTools);

      expect(result).toHaveLength(2);
      const ids = result.map((t) => t.id);
      expect(ids).toContain('ct-1'); // updated
      expect(ids).toContain('ct-3'); // created
      expect(ids).not.toContain('ct-2'); // unrelated
    });

    it('should return empty array for empty input tools', () => {
      const result = filterUpsertedTools([], [
        makeTool({ id: 'ct-1' }),
        makeTool({ id: 'ct-2' }),
      ]);

      expect(result).toEqual([]);
    });

    it('should return empty array when allTools is empty', () => {
      const result = filterUpsertedTools(
        [makeInput({ id: 'ct-1' })],
        []
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when no matches found', () => {
      const inputTools: CustomToolInput[] = [
        makeInput({ id: 'ct-nonexistent' }),
        makeInput({ schema: { type: 'function', function: { name: 'no_match_func', parameters: { type: 'object', properties: {} } } } }),
      ];
      const allTools: CustomTool[] = [
        makeTool({ id: 'ct-1', schema: { type: 'function', function: { name: 'get_weather', parameters: { type: 'object', properties: {} } } } }),
        makeTool({ id: 'ct-2', schema: { type: 'function', function: { name: 'run_query', parameters: { type: 'object', properties: {} } } } }),
      ];

      const result = filterUpsertedTools(inputTools, allTools);

      expect(result).toEqual([]);
    });

    it('should not duplicate tools if ID and name both match', () => {
      // Edge case: a tool being updated also matches by function name
      const inputTools: CustomToolInput[] = [
        makeInput({ id: 'ct-1' }), // update by ID
      ];
      const allTools: CustomTool[] = [
        makeTool({ id: 'ct-1' }), // matches by ID; also has same function name
      ];

      const result = filterUpsertedTools(inputTools, allTools);

      expect(result).toHaveLength(1);
    });

    it('should handle multiple creates with different function names', () => {
      const inputTools: CustomToolInput[] = [
        makeInput({ schema: { type: 'function', function: { name: 'func_a', parameters: { type: 'object', properties: {} } } } }),
        makeInput({ schema: { type: 'function', function: { name: 'func_b', parameters: { type: 'object', properties: {} } } } }),
      ];
      const allTools: CustomTool[] = [
        makeTool({ id: 'ct-x', schema: { type: 'function', function: { name: 'func_a', parameters: { type: 'object', properties: {} } } } }),
        makeTool({ id: 'ct-y', schema: { type: 'function', function: { name: 'func_b', parameters: { type: 'object', properties: {} } } } }),
        makeTool({ id: 'ct-z', schema: { type: 'function', function: { name: 'func_c', parameters: { type: 'object', properties: {} } } } }),
      ];

      const result = filterUpsertedTools(inputTools, allTools);

      expect(result).toHaveLength(2);
      const names = result.map((t) => t.schema.function.name);
      expect(names).toContain('func_a');
      expect(names).toContain('func_b');
      expect(names).not.toContain('func_c');
    });
  });

  // ─── upsertCustomTools (integration with API client) ─────────────────

  describe('upsertCustomTools', () => {
    it('should return only upserted tools, not all workspace tools', async () => {
      // API returns 3 tools (full workspace), but only 1 was upserted
      const thirdTool: CustomTool = {
        id: 'ct-3',
        workspaceId: 'ws-789',
        userId: 'user-456',
        title: 'Unrelated Tool',
        schema: {
          type: 'function',
          function: {
            name: 'unrelated_func',
            parameters: { type: 'object', properties: {} },
          },
        },
        code: 'return null;',
        createdAt: '2024-03-01T00:00:00Z',
        updatedAt: '2024-03-01T00:00:00Z',
      };

      const mockClient = createMockSimApiClient({
        upsertCustomTools: async () => [mockCustomTool, mockCustomToolNoDesc, thirdTool],
      });

      const result = await upsertCustomTools(mockClient, {
        workspaceId: 'ws-789',
        tools: [
          {
            id: 'ct-1', // update existing tool
            title: 'Weather Lookup Updated',
            schema: mockCustomTool.schema,
            code: mockCustomTool.code,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].id).toBe('ct-1');
    });

    it('should handle creating new tools (matched by function name)', async () => {
      const newToolInResponse: CustomTool = {
        id: 'ct-new-auto-id',
        workspaceId: 'ws-789',
        userId: 'user-456',
        title: 'Email Sender',
        schema: {
          type: 'function',
          function: {
            name: 'send_email',
            parameters: {
              type: 'object',
              properties: {
                to: { type: 'string' },
                subject: { type: 'string' },
              },
              required: ['to', 'subject'],
            },
          },
        },
        code: 'async function sendEmail(to, subject) { ... }',
        createdAt: '2024-03-15T12:00:00Z',
        updatedAt: '2024-03-15T12:00:00Z',
      };

      const mockClient = createMockSimApiClient({
        upsertCustomTools: async () => [mockCustomTool, mockCustomToolNoDesc, newToolInResponse],
      });

      const result = await upsertCustomTools(mockClient, {
        workspaceId: 'ws-789',
        tools: [
          {
            // No id → create
            title: 'Email Sender',
            schema: {
              type: 'function',
              function: {
                name: 'send_email',
                parameters: {
                  type: 'object',
                  properties: {
                    to: { type: 'string' },
                    subject: { type: 'string' },
                  },
                  required: ['to', 'subject'],
                },
              },
            },
            code: 'async function sendEmail(to, subject) { ... }',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].id).toBe('ct-new-auto-id');
      expect(result.tools[0].schema.function.name).toBe('send_email');
    });

    it('should handle mixed create and update', async () => {
      const createdTool: CustomTool = {
        id: 'ct-brand-new',
        workspaceId: 'ws-789',
        userId: 'user-456',
        title: 'New Tool',
        schema: {
          type: 'function',
          function: {
            name: 'new_func',
            parameters: { type: 'object', properties: {} },
          },
        },
        code: 'return 42;',
        createdAt: '2024-03-15T12:00:00Z',
        updatedAt: '2024-03-15T12:00:00Z',
      };

      const mockClient = createMockSimApiClient({
        upsertCustomTools: async () => [mockCustomTool, mockCustomToolNoDesc, createdTool],
      });

      const result = await upsertCustomTools(mockClient, {
        workspaceId: 'ws-789',
        tools: [
          { id: 'ct-1', title: 'Updated', schema: mockCustomTool.schema, code: 'updated' }, // update
          { title: 'New Tool', schema: createdTool.schema, code: 'return 42;' }, // create
        ],
      });

      expect(result.success).toBe(true);
      expect(result.tools).toHaveLength(2);
      const ids = result.tools.map((t) => t.id);
      expect(ids).toContain('ct-1');
      expect(ids).toContain('ct-brand-new');
      expect(ids).not.toContain('ct-2'); // unrelated tool filtered out
    });

    it('should handle empty tools array', async () => {
      const mockClient = createMockSimApiClient({
        upsertCustomTools: async () => [mockCustomTool, mockCustomToolNoDesc],
      });

      const result = await upsertCustomTools(mockClient, {
        workspaceId: 'ws-789',
        tools: [],
      });

      expect(result.success).toBe(true);
      expect(result.tools).toEqual([]);
    });

    it('should pass correct arguments to API client', async () => {
      const mockClient = createMockSimApiClient();

      const inputTools: CustomToolInput[] = [
        {
          id: 'ct-1',
          title: 'Updated Weather',
          schema: mockCustomTool.schema,
          code: 'updated code',
        },
      ];

      await upsertCustomTools(mockClient, {
        workspaceId: 'ws-test-123',
        tools: inputTools,
      });

      expect(mockClient.upsertCustomTools).toHaveBeenCalledWith({
        workspaceId: 'ws-test-123',
        tools: inputTools,
      });
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        upsertCustomTools: async () => {
          throw new Error('Forbidden: insufficient permissions');
        },
      });

      await expect(
        upsertCustomTools(mockClient, {
          workspaceId: 'ws-789',
          tools: [
            {
              title: 'Test',
              schema: {
                type: 'function',
                function: {
                  name: 'test',
                  parameters: { type: 'object', properties: {} },
                },
              },
              code: 'return;',
            },
          ],
        })
      ).rejects.toThrow('Forbidden: insufficient permissions');
    });

    it('should return full CustomTool objects (not stripped)', async () => {
      const mockClient = createMockSimApiClient();

      const result = await upsertCustomTools(mockClient, {
        workspaceId: 'ws-789',
        tools: [
          { id: 'ct-1', title: 'Updated', schema: mockCustomTool.schema, code: 'code' },
        ],
      });

      // Verify full tool data is preserved
      const tool = result.tools[0];
      expect(tool.schema).toBeDefined();
      expect(tool.code).toBeDefined();
      expect(tool.workspaceId).toBeDefined();
      expect(tool.createdAt).toBeDefined();
      expect(tool.updatedAt).toBeDefined();
    });
  });
});
