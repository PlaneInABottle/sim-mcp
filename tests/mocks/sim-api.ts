/**
 * SimApiClient Mock
 *
 * Mock implementation of SimApiClient for unit testing.
 * Provides controllable responses for all API methods.
 */

import { vi } from 'vitest';

import type { SimApiClient } from '../../src/client/sim-api-client.js';
import type {
  ExecutionResult,
  ImportWorkflowResponse,
  OperationResponse,
  WorkflowExportPayload,
} from '../../src/client/types.js';
import type { CustomTool } from '../../src/schemas/custom-tools.js';
import type { Skill } from '../../src/schemas/skills.js';
import type { Block, Edge, Workflow, WorkflowWithBlocks } from '../../src/schemas/workflow.js';

/**
 * Sample workflow data for testing
 */
export const mockWorkflow: Workflow = {
  id: 'wf-123',
  userId: 'user-456',
  workspaceId: 'ws-789',
  name: 'Test Workflow',
  description: 'A test workflow for unit testing',
  isDeployed: false,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

/**
 * Sample skill data for testing
 */
export const mockSkill: Skill = {
  id: 'skill-1',
  workspaceId: 'ws-789',
  userId: 'user-456',
  name: 'my-skill',
  description: 'A test skill',
  content: 'Test content for the skill',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
};

/**
 * Sample skill with long content to demonstrate stripping value
 */
export const mockSkillWithLongContent: Skill = {
  id: 'skill-2',
  workspaceId: 'ws-789',
  userId: 'user-456',
  name: 'detailed-skill',
  description: 'A skill with extensive content',
  content: 'A'.repeat(50000), // 50KB content to demonstrate stripping value
  createdAt: new Date('2024-01-16'),
  updatedAt: new Date('2024-01-17'),
};

/**
 * Sample block data for testing
 */
export const mockBlock: Block = {
  id: 'block-1',
  type: 'api_trigger',
  name: 'API Trigger',
  positionX: 100,
  positionY: 100,
  enabled: true,
};

/**
 * Sample block with config
 */
export const mockBlockWithConfig: Block & { data?: Record<string, unknown> } = {
  id: 'block-2',
  type: 'agent',
  name: 'AI Agent',
  positionX: 300,
  positionY: 100,
  enabled: true,
  config: {
    model: 'gpt-4',
    temperature: 0.7,
  },
  subBlocks: [
    {
      id: 'systemPrompt',
      type: 'long-input',
      config: {
        label: 'System Prompt',
      },
    },
  ],
  data: {
    config: {
      maxTokens: 1000,
    },
  },
};

/**
 * Sample edge data for testing
 */
export const mockEdge: Edge = {
  id: 'edge-1',
  sourceBlockId: 'block-1',
  targetBlockId: 'block-2',
  sourceHandle: 'output',
  targetHandle: 'input',
};

/**
 * Sample workflow with blocks and edges
 */
export const mockWorkflowWithBlocks: WorkflowWithBlocks = {
  ...mockWorkflow,
  blocks: [mockBlock, mockBlockWithConfig],
  edges: [mockEdge],
};

/**
 * Sample deployed workflow
 */
export const mockDeployedWorkflow: Workflow = {
  ...mockWorkflow,
  id: 'wf-deployed',
  name: 'Deployed Workflow',
  isDeployed: true,
  deployedAt: '2024-01-16T12:00:00Z',
};

/**
 * Sample execution result
 */
export const mockExecutionResult: ExecutionResult = {
  executionId: 'exec-abc123',
  status: 'completed',
  output: { result: 'success', data: { message: 'Hello World' } },
};

/**
 * Sample operation response
 */
export const mockOperationResponse: OperationResponse = {
  success: true,
  operationId: 'op-123',
  timestamp: Date.now(),
  broadcastSent: true,
};

/**
 * Sample block with full config for export (including subBlocks, data)
 */
export const mockExportBlockWithDetails: Record<string, unknown> = {
  id: 'block-1',
  type: 'agent',
  name: 'AI Agent',
  position: { x: 100, y: 100 },
  enabled: true,
  outputs: { response: { type: 'string' } },
  subBlocks: {
    model: {
      id: 'model',
      type: 'dropdown',
      value: 'gpt-4',
    },
    systemPrompt: {
      id: 'systemPrompt',
      type: 'long-input',
      value: 'You are a helpful assistant.',
    },
    messages: {
      id: 'messages',
      type: 'code',
      value: '[{ role: "user", content: "Hello" }]',
    },
  },
  data: {
    config: {
      temperature: 0.7,
      maxTokens: 1000,
    },
  },
};

/**
 * Sample export payload with full block details
 */
export const mockExportPayload: WorkflowExportPayload = {
  version: '1.0.0',
  exportedAt: '2024-01-15T10:00:00Z',
  workflow: {
    id: 'wf-123',
    name: 'Test Workflow',
    description: 'A test workflow',
    workspaceId: 'ws-789',
  },
  state: {
    blocks: { 'block-1': mockExportBlockWithDetails },
    edges: [
      {
        id: 'edge-1',
        source: 'block-1',
        target: 'block-2',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
    ],
    loops: {},
    parallels: {},
    variables: [
      { id: 'var-1', name: 'apiKey', type: 'string', value: 'secret-key-123' },
      { id: 'var-2', name: 'counter', type: 'number', value: 42 },
    ],
  },
};

/**
 * Sample import response
 */
export const mockImportResponse: ImportWorkflowResponse = {
  workflowId: 'wf-new-123',
  name: 'Imported Workflow',
  success: true,
};

/**
 * Sample custom tool data for testing
 */
export const mockCustomTool: CustomTool = {
  id: 'ct-1',
  workspaceId: 'ws-789',
  userId: 'user-456',
  title: 'Weather Lookup',
  schema: {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get weather for a city',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name' },
          units: { type: 'string', enum: ['celsius', 'fahrenheit'] },
        },
        required: ['city'],
      },
    },
  },
  code: 'async function getWeather(city, units) {\n  const response = await fetch(`https://api.weather.com/${city}`);\n  return response.json();\n}',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

/**
 * Second sample custom tool (without description to test optional field)
 */
export const mockCustomToolNoDesc: CustomTool = {
  id: 'ct-2',
  workspaceId: 'ws-789',
  userId: 'user-456',
  title: 'Database Query',
  schema: {
    type: 'function',
    function: {
      name: 'run_query',
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'SQL query to run' },
        },
        required: ['sql'],
      },
    },
  },
  code: 'async function runQuery(sql) {\n  const db = await getConnection();\n  return db.query(sql);\n}',
  createdAt: '2024-02-10T08:30:00Z',
  updatedAt: '2024-02-10T08:30:00Z',
};

/**
 * Array of mock custom tools for list operations
 */
export const mockCustomTools: CustomTool[] = [mockCustomTool, mockCustomToolNoDesc];

/**
 * Create a mock SimApiClient with all methods including new operation-based ones
 */
export function createMockSimApiClient(
  overrides: Partial<MockSimApiClientMethods> = {}
): SimApiClient & { _mockCalls: MockCallHistory } {
  const callHistory: MockCallHistory = {
    listWorkflows: [],
    getWorkflow: [],
    deleteWorkflow: [],
    executeWorkflow: [],
    // New operation-based methods
    workflowOperation: [],
    addBlocks: [],
    removeBlocks: [],
    updateBlockPosition: [],
    updateBlockName: [],
    toggleBlockEnabled: [],
    updateBlockParent: [],
    addEdgeOperation: [],
    removeEdgeOperation: [],
    replaceWorkflowState: [],
    addVariable: [],
    removeVariable: [],
    subflowOperation: [],
    exportWorkflow: [],
    importWorkflow: [],
    listCustomTools: [],
    upsertCustomTools: [],
    listSkills: [],
  };

  const defaultMethods: MockSimApiClientMethods = {
    listWorkflows: async (params) => {
      callHistory.listWorkflows.push(params);
      return [mockWorkflow, mockDeployedWorkflow];
    },
    getWorkflow: async (workflowId) => {
      callHistory.getWorkflow.push(workflowId);
      if (workflowId === 'not-found') {
        throw new Error('Workflow not found');
      }
      return { ...mockWorkflowWithBlocks, id: workflowId };
    },
    deleteWorkflow: async (workflowId) => {
      callHistory.deleteWorkflow.push(workflowId);
      if (workflowId === 'not-found') {
        throw new Error('Workflow not found');
      }
    },
    executeWorkflow: async (workflowId, input) => {
      callHistory.executeWorkflow.push({ workflowId, input });
      if (workflowId === 'not-deployed') {
        throw new Error('Workflow is not deployed');
      }
      return mockExecutionResult;
    },
    // New operation-based methods
    workflowOperation: async (workflowId, operation, target, payload, options) => {
      callHistory.workflowOperation.push({ workflowId, operation, target, payload, options });
      return mockOperationResponse;
    },
    addBlocks: async (workflowId, blocks, edges, options) => {
      callHistory.addBlocks.push({ workflowId, blocks, edges, options });
      return mockOperationResponse;
    },
    removeBlocks: async (workflowId, blockIds) => {
      callHistory.removeBlocks.push({ workflowId, blockIds });
      return mockOperationResponse;
    },
    updateBlockPosition: async (workflowId, blockId, position, commit) => {
      callHistory.updateBlockPosition.push({ workflowId, blockId, position, commit });
      return mockOperationResponse;
    },
    updateBlockName: async (workflowId, blockId, name) => {
      callHistory.updateBlockName.push({ workflowId, blockId, name });
      return mockOperationResponse;
    },
    toggleBlockEnabled: async (workflowId, blockId, enabled) => {
      callHistory.toggleBlockEnabled.push({ workflowId, blockId, enabled });
      return mockOperationResponse;
    },
    updateBlockParent: async (workflowId, blockId, parentId) => {
      callHistory.updateBlockParent.push({ workflowId, blockId, parentId });
      return mockOperationResponse;
    },
    addEdgeOperation: async (workflowId, edge) => {
      callHistory.addEdgeOperation.push({ workflowId, edge });
      return mockOperationResponse;
    },
    removeEdgeOperation: async (workflowId, edgeId) => {
      callHistory.removeEdgeOperation.push({ workflowId, edgeId });
      return mockOperationResponse;
    },
    replaceWorkflowState: async (workflowId, state) => {
      callHistory.replaceWorkflowState.push({ workflowId, state });
      return mockOperationResponse;
    },
    addVariable: async (workflowId, variable) => {
      callHistory.addVariable.push({ workflowId, variable });
      return mockOperationResponse;
    },
    removeVariable: async (workflowId, variableId) => {
      callHistory.removeVariable.push({ workflowId, variableId });
      return mockOperationResponse;
    },
    subflowOperation: async (workflowId, subflow, operation) => {
      callHistory.subflowOperation.push({ workflowId, subflow, operation });
      return mockOperationResponse;
    },
    exportWorkflow: async (workflowId) => {
      callHistory.exportWorkflow.push(workflowId);
      return mockExportPayload;
    },
    importWorkflow: async (request) => {
      callHistory.importWorkflow.push(request);
      return mockImportResponse;
    },
    listCustomTools: async (params) => {
      callHistory.listCustomTools.push(params);
      return [...mockCustomTools];
    },
    upsertCustomTools: async (params) => {
      callHistory.upsertCustomTools.push(params);
      return [...mockCustomTools];
    },
    listSkills: async (params) => {
      callHistory.listSkills.push(params);
      return [mockSkill, mockSkillWithLongContent];
    },
  };

  const methods = { ...defaultMethods, ...overrides };

  // Create mock client with all methods
  const mockClient = {
    // HTTP methods (not typically used in tests)
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    setApiKey: vi.fn(),
    getBaseUrl: vi.fn(() => 'http://localhost:3000'),

    // Core workflow methods
    listWorkflows: vi.fn(methods.listWorkflows),
    getWorkflow: vi.fn(methods.getWorkflow),
    deleteWorkflow: vi.fn(methods.deleteWorkflow),
    executeWorkflow: vi.fn(methods.executeWorkflow),

    // Operation-based methods
    workflowOperation: vi.fn(methods.workflowOperation),
    addBlocks: vi.fn(methods.addBlocks),
    removeBlocks: vi.fn(methods.removeBlocks),
    updateBlockPosition: vi.fn(methods.updateBlockPosition),
    updateBlockName: vi.fn(methods.updateBlockName),
    toggleBlockEnabled: vi.fn(methods.toggleBlockEnabled),
    updateBlockParent: vi.fn(methods.updateBlockParent),
    addEdgeOperation: vi.fn(methods.addEdgeOperation),
    removeEdgeOperation: vi.fn(methods.removeEdgeOperation),
    replaceWorkflowState: vi.fn(methods.replaceWorkflowState),
    addVariable: vi.fn(methods.addVariable),
    removeVariable: vi.fn(methods.removeVariable),
    subflowOperation: vi.fn(methods.subflowOperation),

    // Import/Export methods
    exportWorkflow: vi.fn(methods.exportWorkflow),
    importWorkflow: vi.fn(methods.importWorkflow),

    // Custom tools methods
    listCustomTools: vi.fn(methods.listCustomTools),
    upsertCustomTools: vi.fn(methods.upsertCustomTools),

    // Skills methods
    listSkills: vi.fn(methods.listSkills),

    // Call history for assertions
    _mockCalls: callHistory,
  } as unknown as SimApiClient & { _mockCalls: MockCallHistory };

  return mockClient;
}

/**
 * Mock method signatures for new operation-based API
 */
export interface MockSimApiClientMethods {
  listWorkflows: (params?: { workspaceId?: string; limit?: number; offset?: number }) => Promise<
    Workflow[]
  >;
  getWorkflow: (workflowId: string) => Promise<WorkflowWithBlocks>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  executeWorkflow: (
    workflowId: string,
    input?: Record<string, unknown>
  ) => Promise<ExecutionResult>;
  // Operation-based methods
  workflowOperation: (
    workflowId: string,
    operation: string,
    target: string,
    payload: Record<string, unknown>,
    options?: { broadcast?: boolean; timestamp?: number }
  ) => Promise<OperationResponse>;
  addBlocks: (
    workflowId: string,
    blocks: Array<Record<string, unknown>>,
    edges?: Array<Record<string, unknown>>,
    options?: Record<string, unknown>
  ) => Promise<OperationResponse>;
  removeBlocks: (workflowId: string, blockIds: string[]) => Promise<OperationResponse>;
  updateBlockPosition: (
    workflowId: string,
    blockId: string,
    position: { x: number; y: number },
    commit?: boolean
  ) => Promise<OperationResponse>;
  updateBlockName: (
    workflowId: string,
    blockId: string,
    name: string
  ) => Promise<OperationResponse>;
  toggleBlockEnabled: (
    workflowId: string,
    blockId: string,
    enabled: boolean
  ) => Promise<OperationResponse>;
  updateBlockParent: (
    workflowId: string,
    blockId: string,
    parentId: string | null
  ) => Promise<OperationResponse>;
  addEdgeOperation: (
    workflowId: string,
    edge: Record<string, unknown>
  ) => Promise<OperationResponse>;
  removeEdgeOperation: (workflowId: string, edgeId: string) => Promise<OperationResponse>;
  replaceWorkflowState: (
    workflowId: string,
    state: Record<string, unknown>
  ) => Promise<OperationResponse>;
  addVariable: (
    workflowId: string,
    variable: { id: string; name: string; type: string; value: unknown }
  ) => Promise<OperationResponse>;
  removeVariable: (workflowId: string, variableId: string) => Promise<OperationResponse>;
  subflowOperation: (
    workflowId: string,
    subflow: { id: string; type?: string; config?: Record<string, unknown> },
    operation: 'add' | 'update' | 'remove'
  ) => Promise<OperationResponse>;
  exportWorkflow: (workflowId: string) => Promise<WorkflowExportPayload>;
  importWorkflow: (request: Record<string, unknown>) => Promise<ImportWorkflowResponse>;
  listCustomTools: (params?: {
    workspaceId?: string;
    workflowId?: string;
  }) => Promise<CustomTool[]>;
  upsertCustomTools: (params: Record<string, unknown>) => Promise<CustomTool[]>;
  listSkills: (params: { workspaceId: string }) => Promise<Skill[]>;
}

/**
 * Call history for tracking mock calls
 */
export interface MockCallHistory {
  listWorkflows: Array<{ workspaceId?: string; limit?: number; offset?: number } | undefined>;
  getWorkflow: string[];
  deleteWorkflow: string[];
  executeWorkflow: Array<{ workflowId: string; input?: Record<string, unknown> }>;
  // Operation-based methods
  workflowOperation: Array<{
    workflowId: string;
    operation: string;
    target: string;
    payload: Record<string, unknown>;
    options?: { broadcast?: boolean; timestamp?: number };
  }>;
  addBlocks: Array<{
    workflowId: string;
    blocks: Array<Record<string, unknown>>;
    edges?: Array<Record<string, unknown>>;
    options?: Record<string, unknown>;
  }>;
  removeBlocks: Array<{ workflowId: string; blockIds: string[] }>;
  updateBlockPosition: Array<{
    workflowId: string;
    blockId: string;
    position: { x: number; y: number };
    commit?: boolean;
  }>;
  updateBlockName: Array<{ workflowId: string; blockId: string; name: string }>;
  toggleBlockEnabled: Array<{ workflowId: string; blockId: string; enabled: boolean }>;
  updateBlockParent: Array<{ workflowId: string; blockId: string; parentId: string | null }>;
  addEdgeOperation: Array<{ workflowId: string; edge: Record<string, unknown> }>;
  removeEdgeOperation: Array<{ workflowId: string; edgeId: string }>;
  replaceWorkflowState: Array<{ workflowId: string; state: Record<string, unknown> }>;
  addVariable: Array<{
    workflowId: string;
    variable: { id: string; name: string; type: string; value: unknown };
  }>;
  removeVariable: Array<{ workflowId: string; variableId: string }>;
  subflowOperation: Array<{
    workflowId: string;
    subflow: { id: string; type?: string; config?: Record<string, unknown> };
    operation: 'add' | 'update' | 'remove';
  }>;
  exportWorkflow: string[];
  importWorkflow: Array<Record<string, unknown>>;
  listCustomTools: Array<{ workspaceId?: string; workflowId?: string } | undefined>;
  upsertCustomTools: Array<Record<string, unknown>>;
  listSkills: Array<{ workspaceId: string }>;
}
