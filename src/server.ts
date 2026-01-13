/**
 * MCP Server Configuration
 *
 * Initializes and runs the Model Context Protocol server.
 * Uses stdio transport for MCP communication.
 * Uses low-level Server API with JSON Schema for tool definitions.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { type SimApiClient, createSimApiClient, formatMcpError } from './client/index.js';
import { ConfigurationError, type SimMcpConfig, loadConfig } from './config/index.js';
import {
  // Block tools
  ADD_BLOCKS_DESCRIPTION,
  ADD_BLOCKS_TOOL_NAME,
  // Edge tools
  ADD_EDGE_OP_DESCRIPTION,
  ADD_EDGE_OP_TOOL_NAME,
  // Variable tools
  ADD_VARIABLE_DESCRIPTION,
  ADD_VARIABLE_TOOL_NAME,
  EXPORT_WORKFLOW_DESCRIPTION,
  EXPORT_WORKFLOW_TOOL_NAME,
  GET_WORKFLOW_DESCRIPTION,
  GET_WORKFLOW_TOOL_NAME,
  // Custom tools
  LIST_CUSTOM_TOOLS_DESCRIPTION,
  LIST_CUSTOM_TOOLS_TOOL_NAME,
  // Workflow tools
  LIST_WORKFLOWS_DESCRIPTION,
  LIST_WORKFLOWS_TOOL_NAME,
  REMOVE_BLOCKS_DESCRIPTION,
  REMOVE_BLOCKS_TOOL_NAME,
  REMOVE_EDGE_OP_DESCRIPTION,
  REMOVE_EDGE_OP_TOOL_NAME,
  REMOVE_VARIABLE_DESCRIPTION,
  REMOVE_VARIABLE_TOOL_NAME,
  REPLACE_WORKFLOW_STATE_DESCRIPTION,
  REPLACE_WORKFLOW_STATE_TOOL_NAME,
  TOGGLE_BLOCK_ENABLED_DESCRIPTION,
  TOGGLE_BLOCK_ENABLED_TOOL_NAME,
  UPDATE_BLOCK_NAME_DESCRIPTION,
  UPDATE_BLOCK_NAME_TOOL_NAME,
  UPDATE_SUBBLOCK_DESCRIPTION,
  UPDATE_SUBBLOCK_TOOL_NAME,
  UPDATE_SUBFLOW_DESCRIPTION,
  UPDATE_SUBFLOW_TOOL_NAME,
  UPSERT_CUSTOM_TOOLS_DESCRIPTION,
  UPSERT_CUSTOM_TOOLS_TOOL_NAME,
  addBlocks,
  addBlocksInputSchema,
  addEdgeOp,
  addEdgeOpInputSchema,
  addVariable,
  addVariableInputSchema,
  exportWorkflow,
  exportWorkflowInputSchema,
  getWorkflow,
  getWorkflowInputSchema,
  listCustomTools,
  listCustomToolsInputSchema,
  listWorkflows,
  listWorkflowsInputSchema,
  removeBlocks,
  removeBlocksInputSchema,
  removeEdgeOp,
  removeEdgeOpInputSchema,
  removeVariable,
  removeVariableInputSchema,
  replaceWorkflowState,
  replaceWorkflowStateInputSchema,
  toggleBlockEnabled,
  toggleBlockEnabledInputSchema,
  updateBlockName,
  updateBlockNameInputSchema,
  updateSubblock,
  updateSubblockInputSchema,
  updateSubflow,
  updateSubflowInputSchema,
  upsertCustomTools,
  upsertCustomToolsInputSchema,
} from './tools/index.js';
import { getLogger, initializeLogger } from './utils/logger.js';

/**
 * Server metadata
 */
const SERVER_NAME = 'sim-mcp';
const SERVER_VERSION = '0.0.1';

/**
 * Global transport instance for shutdown handling
 */
let transport: StdioServerTransport | null = null;

/**
 * Initialize the sim API client
 */
function initializeApiClient(config: SimMcpConfig): SimApiClient {
  return createSimApiClient({
    baseUrl: config.apiBaseUrl,
    apiKey: config.apiKey,
    timeout: config.timeout,
    retries: config.retries,
  });
}

/**
 * Register MCP tools with the server using low-level API
 *
 * Sets up request handlers for ListToolsRequestSchema and CallToolRequestSchema
 * to handle tool listing and execution with JSON Schema format.
 */
function registerTools(server: Server, apiClient: SimApiClient): void {
  const logger = getLogger();

  // Helper to create tool response
  const createResponse = (data: unknown): CallToolResult => ({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  });

  // Helper to create error response
  const createErrorResponse = (error: unknown): CallToolResult => ({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(formatMcpError(error), null, 2),
      },
    ],
    isError: true,
  });

  // Define all tools with their JSON Schema input schemas
  const tools = [
    {
      name: 'list_tools',
      description: 'List available sim-mcp tools',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    // Workflow tools (4 working + 3 new)
    {
      name: LIST_WORKFLOWS_TOOL_NAME,
      description: LIST_WORKFLOWS_DESCRIPTION,
      inputSchema: listWorkflowsInputSchema,
    },
    {
      name: GET_WORKFLOW_TOOL_NAME,
      description: GET_WORKFLOW_DESCRIPTION,
      inputSchema: getWorkflowInputSchema,
    },
    {
      name: EXPORT_WORKFLOW_TOOL_NAME,
      description: EXPORT_WORKFLOW_DESCRIPTION,
      inputSchema: exportWorkflowInputSchema,
    },
    {
      name: REPLACE_WORKFLOW_STATE_TOOL_NAME,
      description: REPLACE_WORKFLOW_STATE_DESCRIPTION,
      inputSchema: replaceWorkflowStateInputSchema,
    },
    // Block tools (5 new operation-based)
    {
      name: ADD_BLOCKS_TOOL_NAME,
      description: ADD_BLOCKS_DESCRIPTION,
      inputSchema: addBlocksInputSchema,
    },
    {
      name: REMOVE_BLOCKS_TOOL_NAME,
      description: REMOVE_BLOCKS_DESCRIPTION,
      inputSchema: removeBlocksInputSchema,
    },
    {
      name: UPDATE_BLOCK_NAME_TOOL_NAME,
      description: UPDATE_BLOCK_NAME_DESCRIPTION,
      inputSchema: updateBlockNameInputSchema,
    },
    {
      name: TOGGLE_BLOCK_ENABLED_TOOL_NAME,
      description: TOGGLE_BLOCK_ENABLED_DESCRIPTION,
      inputSchema: toggleBlockEnabledInputSchema,
    },
    {
      name: UPDATE_SUBBLOCK_TOOL_NAME,
      description: UPDATE_SUBBLOCK_DESCRIPTION,
      inputSchema: updateSubblockInputSchema,
    },
    // Edge tools (2 operation-based)
    {
      name: ADD_EDGE_OP_TOOL_NAME,
      description: ADD_EDGE_OP_DESCRIPTION,
      inputSchema: addEdgeOpInputSchema,
    },
    {
      name: REMOVE_EDGE_OP_TOOL_NAME,
      description: REMOVE_EDGE_OP_DESCRIPTION,
      inputSchema: removeEdgeOpInputSchema,
    },
    // Variable tools (2 new)
    {
      name: ADD_VARIABLE_TOOL_NAME,
      description: ADD_VARIABLE_DESCRIPTION,
      inputSchema: addVariableInputSchema,
    },
    {
      name: REMOVE_VARIABLE_TOOL_NAME,
      description: REMOVE_VARIABLE_DESCRIPTION,
      inputSchema: removeVariableInputSchema,
    },
    // Subflow tool
    {
      name: UPDATE_SUBFLOW_TOOL_NAME,
      description: UPDATE_SUBFLOW_DESCRIPTION,
      inputSchema: updateSubflowInputSchema,
    },
    // Custom tools
    {
      name: LIST_CUSTOM_TOOLS_TOOL_NAME,
      description: LIST_CUSTOM_TOOLS_DESCRIPTION,
      inputSchema: listCustomToolsInputSchema,
    },
    {
      name: UPSERT_CUSTOM_TOOLS_TOOL_NAME,
      description: UPSERT_CUSTOM_TOOLS_DESCRIPTION,
      inputSchema: upsertCustomToolsInputSchema,
    },
  ];

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'list_tools': {
          return createResponse({
            message: 'sim-mcp server is running',
            version: SERVER_VERSION,
            tools: tools.map((t) => ({ name: t.name, description: t.description })),
          });
        }

        // Workflow tools
        case LIST_WORKFLOWS_TOOL_NAME: {
          const input = args as { workspaceId?: string; limit?: number; offset?: number };
          const result = await listWorkflows(apiClient, input);
          return createResponse(result);
        }

        case GET_WORKFLOW_TOOL_NAME: {
          const input = args as { workflowId: string };
          const result = await getWorkflow(apiClient, input);
          return createResponse(result);
        }

        case EXPORT_WORKFLOW_TOOL_NAME: {
          const input = args as { workflowId: string };
          const result = await exportWorkflow(apiClient, input);
          return createResponse(result);
        }

        case REPLACE_WORKFLOW_STATE_TOOL_NAME: {
          const input = args as { workflowId: string; state: Record<string, unknown> };
          const result = await replaceWorkflowState(apiClient, input);
          return createResponse(result);
        }

        // Block tools
        case ADD_BLOCKS_TOOL_NAME: {
          const input = args as {
            workflowId: string;
            blocks: Array<{
              id?: string;
              type: string;
              name: string;
              position: { x: number; y: number };
              data?: Record<string, unknown>;
              enabled?: boolean;
            }>;
            edges?: Array<{
              id: string;
              source: string;
              target: string;
              sourceHandle?: string | null;
              targetHandle?: string | null;
            }>;
          };
          const result = await addBlocks(apiClient, input);
          return createResponse(result);
        }

        case REMOVE_BLOCKS_TOOL_NAME: {
          const input = args as { workflowId: string; blockIds: string[] };
          const result = await removeBlocks(apiClient, input);
          return createResponse(result);
        }

        case UPDATE_BLOCK_NAME_TOOL_NAME: {
          const input = args as { workflowId: string; blockId: string; name: string };
          const result = await updateBlockName(apiClient, input);
          return createResponse(result);
        }

        case TOGGLE_BLOCK_ENABLED_TOOL_NAME: {
          const input = args as { workflowId: string; blockId: string; enabled: boolean };
          const result = await toggleBlockEnabled(apiClient, input);
          return createResponse(result);
        }

        case UPDATE_SUBBLOCK_TOOL_NAME: {
          const input = args as {
            workflowId: string;
            blockId: string;
            subblockId: string;
            value: unknown;
          };
          const result = await updateSubblock(apiClient, input);
          return createResponse(result);
        }

        // Edge tools
        case ADD_EDGE_OP_TOOL_NAME: {
          const input = args as {
            workflowId: string;
            source: string;
            target: string;
            sourceHandle?: string;
            targetHandle?: string;
            edgeId?: string;
          };
          const result = await addEdgeOp(apiClient, input);
          return createResponse(result);
        }

        case REMOVE_EDGE_OP_TOOL_NAME: {
          const input = args as { workflowId: string; edgeId: string };
          const result = await removeEdgeOp(apiClient, input);
          return createResponse(result);
        }

        // Variable tools
        case ADD_VARIABLE_TOOL_NAME: {
          const input = args as {
            workflowId: string;
            id?: string;
            name: string;
            type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'plain';
            value: unknown;
          };
          const result = await addVariable(apiClient, input);
          return createResponse(result);
        }

        case REMOVE_VARIABLE_TOOL_NAME: {
          const input = args as { workflowId: string; variableId: string };
          const result = await removeVariable(apiClient, input);
          return createResponse(result);
        }

        // Subflow tools
        case UPDATE_SUBFLOW_TOOL_NAME: {
          const input = args as {
            workflowId: string;
            id: string;
            type?: 'loop' | 'parallel';
            config?: Record<string, unknown>;
          };
          const result = await updateSubflow(apiClient, input);
          return createResponse(result);
        }

        // Custom tools
        case LIST_CUSTOM_TOOLS_TOOL_NAME: {
          const input = args as { workspaceId?: string; workflowId?: string };
          const result = await listCustomTools(apiClient, input);
          return createResponse(result);
        }

        case UPSERT_CUSTOM_TOOLS_TOOL_NAME: {
          const input = args as {
            workspaceId: string;
            tools: Array<{
              id?: string;
              title: string;
              schema: {
                type: 'function';
                function: {
                  name: string;
                  description?: string;
                  parameters: {
                    type: string;
                    properties: Record<string, unknown>;
                    required?: string[];
                  };
                };
              };
              code: string;
            }>;
          };
          const result = await upsertCustomTools(apiClient, input);
          return createResponse(result);
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  logger.info('Tools registered', {
    operation: 'register_tools',
    count: tools.length,
  });
}

/**
 * Setup graceful shutdown handlers
 */
function setupShutdownHandlers(): void {
  const logger = getLogger();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`, {
      operation: 'shutdown',
      signal,
    });

    try {
      if (transport) {
        await transport.close();
      }
      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        operation: 'shutdown_error',
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  };

  // Handle termination signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      operation: 'uncaught_exception',
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', {
      operation: 'unhandled_rejection',
      reason: String(reason),
    });
    process.exit(1);
  });
}

/**
 * Start the MCP server
 */
export async function startServer(): Promise<void> {
  // Load and validate configuration
  let config: SimMcpConfig;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigurationError) {
      process.stderr.write(`Configuration error:\n${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }

  // Initialize logger with configured level
  const logger = initializeLogger(config.logLevel);
  logger.info('Starting sim-mcp server', {
    operation: 'startup',
    version: SERVER_VERSION,
  });

  // Initialize API client
  const apiClient = initializeApiClient(config);
  logger.info('API client initialized', {
    operation: 'init_client',
    baseUrl: config.apiBaseUrl,
  });

  // Create MCP server using low-level API with tools capability
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: { listChanged: true } } }
  );

  // Register tools
  registerTools(server, apiClient);

  // Setup shutdown handlers
  setupShutdownHandlers();

  // Create stdio transport
  transport = new StdioServerTransport();

  // Connect server to transport
  logger.info('Connecting to stdio transport', {
    operation: 'connect_transport',
  });

  await server.connect(transport);

  logger.info('sim-mcp server started successfully', {
    operation: 'server_ready',
    transport: 'stdio',
  });
}
