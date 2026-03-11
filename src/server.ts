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
  ADD_BLOCKS_DESCRIPTION,
  ADD_BLOCKS_TOOL_NAME,
  ADD_EDGE_OP_DESCRIPTION,
  ADD_EDGE_OP_TOOL_NAME,
  ADD_VARIABLE_DESCRIPTION,
  ADD_VARIABLE_TOOL_NAME,
  CANCEL_EXECUTION_DESCRIPTION,
  CANCEL_EXECUTION_TOOL_NAME,
  CREATE_SKILL_DESCRIPTION,
  CREATE_SKILL_TOOL_NAME,
  CREATE_WORKFLOW_DESCRIPTION,
  CREATE_WORKFLOW_TOOL_NAME,
  DELETE_SKILL_DESCRIPTION,
  DELETE_SKILL_TOOL_NAME,
  DELETE_WORKFLOW_DESCRIPTION,
  DELETE_WORKFLOW_TOOL_NAME,
  DEPLOY_WORKFLOW_DESCRIPTION,
  DEPLOY_WORKFLOW_TOOL_NAME,
  EXECUTE_WORKFLOW_DESCRIPTION,
  EXECUTE_WORKFLOW_TOOL_NAME,
  GET_BLOCK_DESCRIPTION,
  GET_BLOCK_TOOL_NAME,
  GET_CUSTOM_TOOL_DESCRIPTION,
  GET_CUSTOM_TOOL_TOOL_NAME,
  GET_DEPLOYED_WORKFLOW_STATE_DESCRIPTION,
  GET_DEPLOYED_WORKFLOW_STATE_TOOL_NAME,
  GET_EXECUTION_LOGS_DESCRIPTION,
  GET_EXECUTION_LOGS_TOOL_NAME,
  GET_EXECUTION_LOG_DETAIL_DESCRIPTION,
  GET_EXECUTION_LOG_DETAIL_TOOL_NAME,
  GET_SKILL_DESCRIPTION,
  GET_SKILL_TOOL_NAME,
  GET_WORKFLOW_DESCRIPTION,
  GET_WORKFLOW_STATUS_DESCRIPTION,
  GET_WORKFLOW_STATUS_TOOL_NAME,
  GET_WORKFLOW_TOOL_NAME,
  LIST_CUSTOM_TOOLS_DESCRIPTION,
  LIST_CUSTOM_TOOLS_TOOL_NAME,
  LIST_SKILLS_DESCRIPTION,
  LIST_SKILLS_TOOL_NAME,
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
  RUN_BLOCK_DESCRIPTION,
  RUN_BLOCK_TOOL_NAME,
  RUN_FROM_BLOCK_DESCRIPTION,
  RUN_FROM_BLOCK_TOOL_NAME,
  RUN_WORKFLOW_UNTIL_BLOCK_DESCRIPTION,
  RUN_WORKFLOW_UNTIL_BLOCK_TOOL_NAME,
  TOGGLE_BLOCK_ENABLED_DESCRIPTION,
  TOGGLE_BLOCK_ENABLED_TOOL_NAME,
  UNDEPLOY_WORKFLOW_DESCRIPTION,
  UNDEPLOY_WORKFLOW_TOOL_NAME,
  UPDATE_BLOCK_NAME_DESCRIPTION,
  UPDATE_BLOCK_NAME_TOOL_NAME,
  UPDATE_BLOCK_PARENT_DESCRIPTION,
  UPDATE_BLOCK_PARENT_TOOL_NAME,
  UPDATE_SKILL_DESCRIPTION,
  UPDATE_SKILL_TOOL_NAME,
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
  cancelExecution,
  cancelExecutionInputSchema,
  createSkill,
  createSkillInputSchema,
  createWorkflow,
  createWorkflowInputSchema,
  deleteSkill,
  deleteSkillInputSchema,
  deleteWorkflow,
  deleteWorkflowInputSchema,
  deployWorkflow,
  deployWorkflowInputSchema,
  executeWorkflow,
  executeWorkflowInputSchema,
  getBlock,
  getBlockInputSchema,
  getCustomTool,
  getCustomToolInputSchema,
  getDeployedWorkflowState,
  getDeployedWorkflowStateInputSchema,
  getExecutionLogDetail,
  getExecutionLogDetailInputSchema,
  getExecutionLogs,
  getExecutionLogsInputSchema,
  getSkill,
  getSkillInputSchema,
  getWorkflow,
  getWorkflowInputSchema,
  getWorkflowStatus,
  getWorkflowStatusInputSchema,
  listCustomTools,
  listCustomToolsInputSchema,
  listSkills,
  listSkillsInputSchema,
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
  runBlock,
  runBlockInputSchema,
  runFromBlock,
  runFromBlockInputSchema,
  runWorkflowUntilBlock,
  runWorkflowUntilBlockInputSchema,
  toggleBlockEnabled,
  toggleBlockEnabledInputSchema,
  undeployWorkflow,
  undeployWorkflowInputSchema,
  updateBlockName,
  updateBlockNameInputSchema,
  updateBlockParent,
  updateBlockParentInputSchema,
  updateSkill,
  updateSkillInputSchema,
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
    // Workflow tools
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
      name: REPLACE_WORKFLOW_STATE_TOOL_NAME,
      description: REPLACE_WORKFLOW_STATE_DESCRIPTION,
      inputSchema: replaceWorkflowStateInputSchema,
    },
    {
      name: EXECUTE_WORKFLOW_TOOL_NAME,
      description: EXECUTE_WORKFLOW_DESCRIPTION,
      inputSchema: executeWorkflowInputSchema,
    },
    {
      name: RUN_WORKFLOW_UNTIL_BLOCK_TOOL_NAME,
      description: RUN_WORKFLOW_UNTIL_BLOCK_DESCRIPTION,
      inputSchema: runWorkflowUntilBlockInputSchema,
    },
    {
      name: RUN_FROM_BLOCK_TOOL_NAME,
      description: RUN_FROM_BLOCK_DESCRIPTION,
      inputSchema: runFromBlockInputSchema,
    },
    {
      name: RUN_BLOCK_TOOL_NAME,
      description: RUN_BLOCK_DESCRIPTION,
      inputSchema: runBlockInputSchema,
    },
    {
      name: CANCEL_EXECUTION_TOOL_NAME,
      description: CANCEL_EXECUTION_DESCRIPTION,
      inputSchema: cancelExecutionInputSchema,
    },
    {
      name: CREATE_WORKFLOW_TOOL_NAME,
      description: CREATE_WORKFLOW_DESCRIPTION,
      inputSchema: createWorkflowInputSchema,
    },
    {
      name: DELETE_WORKFLOW_TOOL_NAME,
      description: DELETE_WORKFLOW_DESCRIPTION,
      inputSchema: deleteWorkflowInputSchema,
    },
    {
      name: GET_WORKFLOW_STATUS_TOOL_NAME,
      description: GET_WORKFLOW_STATUS_DESCRIPTION,
      inputSchema: getWorkflowStatusInputSchema,
    },
    {
      name: GET_DEPLOYED_WORKFLOW_STATE_TOOL_NAME,
      description: GET_DEPLOYED_WORKFLOW_STATE_DESCRIPTION,
      inputSchema: getDeployedWorkflowStateInputSchema,
    },
    {
      name: DEPLOY_WORKFLOW_TOOL_NAME,
      description: DEPLOY_WORKFLOW_DESCRIPTION,
      inputSchema: deployWorkflowInputSchema,
    },
    {
      name: UNDEPLOY_WORKFLOW_TOOL_NAME,
      description: UNDEPLOY_WORKFLOW_DESCRIPTION,
      inputSchema: undeployWorkflowInputSchema,
    },
    // Execution logs tools
    {
      name: GET_EXECUTION_LOGS_TOOL_NAME,
      description: GET_EXECUTION_LOGS_DESCRIPTION,
      inputSchema: getExecutionLogsInputSchema,
    },
    {
      name: GET_EXECUTION_LOG_DETAIL_TOOL_NAME,
      description: GET_EXECUTION_LOG_DETAIL_DESCRIPTION,
      inputSchema: getExecutionLogDetailInputSchema,
    },
    // Block tools (6 operation-based)
    {
      name: GET_BLOCK_TOOL_NAME,
      description: GET_BLOCK_DESCRIPTION,
      inputSchema: getBlockInputSchema,
    },
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
      name: UPDATE_BLOCK_PARENT_TOOL_NAME,
      description: UPDATE_BLOCK_PARENT_DESCRIPTION,
      inputSchema: updateBlockParentInputSchema,
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
      name: GET_CUSTOM_TOOL_TOOL_NAME,
      description: GET_CUSTOM_TOOL_DESCRIPTION,
      inputSchema: getCustomToolInputSchema,
    },
    {
      name: UPSERT_CUSTOM_TOOLS_TOOL_NAME,
      description: UPSERT_CUSTOM_TOOLS_DESCRIPTION,
      inputSchema: upsertCustomToolsInputSchema,
    },
    // Skills tools
    {
      name: LIST_SKILLS_TOOL_NAME,
      description: LIST_SKILLS_DESCRIPTION,
      inputSchema: listSkillsInputSchema,
    },
    {
      name: GET_SKILL_TOOL_NAME,
      description: GET_SKILL_DESCRIPTION,
      inputSchema: getSkillInputSchema,
    },
    {
      name: CREATE_SKILL_TOOL_NAME,
      description: CREATE_SKILL_DESCRIPTION,
      inputSchema: createSkillInputSchema,
    },
    {
      name: UPDATE_SKILL_TOOL_NAME,
      description: UPDATE_SKILL_DESCRIPTION,
      inputSchema: updateSkillInputSchema,
    },
    {
      name: DELETE_SKILL_TOOL_NAME,
      description: DELETE_SKILL_DESCRIPTION,
      inputSchema: deleteSkillInputSchema,
    },
  ];

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  const parseToolArguments = <T extends Record<string, unknown>>(args: unknown): T =>
    (args ?? {}) as T;

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
          const input = parseToolArguments<{
            workspaceId?: string;
            limit?: number;
            offset?: number;
          }>(args);
          const result = await listWorkflows(apiClient, input);
          return createResponse(result);
        }

        case GET_WORKFLOW_TOOL_NAME: {
          const input = parseToolArguments<{ workflowId: string; verbose?: boolean }>(args);
          const result = await getWorkflow(apiClient, input);
          return createResponse(result);
        }

        case REPLACE_WORKFLOW_STATE_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            state: Record<string, unknown>;
          }>(args);
          const result = await replaceWorkflowState(apiClient, input);
          return createResponse(result);
        }

        case EXECUTE_WORKFLOW_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            input?: Record<string, unknown>;
            triggerType?: string;
          }>(args);
          const result = await executeWorkflow(apiClient, input);
          return createResponse(result);
        }

        case RUN_WORKFLOW_UNTIL_BLOCK_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            stopAfterBlockId: string;
            input?: Record<string, unknown>;
            triggerType?: string;
            useDraftState?: boolean;
          }>(args);
          const result = await runWorkflowUntilBlock(apiClient, input);
          return createResponse(result);
        }

        case RUN_FROM_BLOCK_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            startBlockId: string;
            executionId?: string;
            input?: Record<string, unknown>;
            triggerType?: string;
            useDraftState?: boolean;
          }>(args);
          const result = await runFromBlock(apiClient, input);
          return createResponse(result);
        }

        case RUN_BLOCK_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            blockId: string;
            executionId?: string;
            input?: Record<string, unknown>;
            triggerType?: string;
            useDraftState?: boolean;
          }>(args);
          const result = await runBlock(apiClient, input);
          return createResponse(result);
        }

        case CANCEL_EXECUTION_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            executionId: string;
          }>(args);
          const result = await cancelExecution(apiClient, input);
          return createResponse(result);
        }

        case CREATE_WORKFLOW_TOOL_NAME: {
          const input = parseToolArguments<{
            name: string;
            workspaceId: string;
            description?: string;
            color?: string;
            folderId?: string;
            sortOrder?: number;
          }>(args);
          const result = await createWorkflow(apiClient, input);
          return createResponse(result);
        }

        case DELETE_WORKFLOW_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            checkTemplates?: boolean;
            templateAction?: 'delete' | 'orphan';
          }>(args);
          const result = await deleteWorkflow(apiClient, input);
          return createResponse(result);
        }

        case GET_WORKFLOW_STATUS_TOOL_NAME: {
          const input = parseToolArguments<{ workflowId: string }>(args);
          const result = await getWorkflowStatus(apiClient, input);
          return createResponse(result);
        }

        case GET_DEPLOYED_WORKFLOW_STATE_TOOL_NAME: {
          const input = parseToolArguments<{ workflowId: string }>(args);
          const result = await getDeployedWorkflowState(apiClient, input);
          return createResponse(result);
        }

        case DEPLOY_WORKFLOW_TOOL_NAME: {
          const input = parseToolArguments<{ workflowId: string }>(args);
          const result = await deployWorkflow(apiClient, input);
          return createResponse(result);
        }

        case UNDEPLOY_WORKFLOW_TOOL_NAME: {
          const input = parseToolArguments<{ workflowId: string }>(args);
          const result = await undeployWorkflow(apiClient, input);
          return createResponse(result);
        }

        // Execution logs tools
        case GET_EXECUTION_LOGS_TOOL_NAME: {
          const input = parseToolArguments<{
            workspaceId: string;
            workflowId?: string;
            executionId?: string;
            level?: 'info' | 'error';
            startDate?: string;
            endDate?: string;
            minDurationMs?: number;
            maxDurationMs?: number;
            minCost?: number;
            maxCost?: number;
            trigger?: string;
            limit?: number;
            cursor?: string;
            order?: 'desc' | 'asc';
            details?: 'basic' | 'full';
            includeTraceSpans?: boolean;
            includeFinalOutput?: boolean;
          }>(args);
          const result = await getExecutionLogs(apiClient, input);
          return createResponse(result);
        }

        case GET_EXECUTION_LOG_DETAIL_TOOL_NAME: {
          const input = parseToolArguments<{ logId: string }>(args);
          const result = await getExecutionLogDetail(apiClient, input);
          return createResponse(result);
        }

        // Block tools
        case GET_BLOCK_TOOL_NAME: {
          const input = parseToolArguments<{ workflowId: string; blockId: string }>(args);
          const result = await getBlock(apiClient, input);
          return createResponse(result);
        }

        case ADD_BLOCKS_TOOL_NAME: {
          const input = parseToolArguments<{
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
          }>(args);
          const result = await addBlocks(apiClient, input);
          return createResponse(result);
        }

        case REMOVE_BLOCKS_TOOL_NAME: {
          const input = parseToolArguments<{ workflowId: string; blockIds: string[] }>(args);
          const result = await removeBlocks(apiClient, input);
          return createResponse(result);
        }

        case UPDATE_BLOCK_NAME_TOOL_NAME: {
          const input = parseToolArguments<{ workflowId: string; blockId: string; name: string }>(
            args
          );
          const result = await updateBlockName(apiClient, input);
          return createResponse(result);
        }

        case TOGGLE_BLOCK_ENABLED_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            blockId: string;
            enabled: boolean;
          }>(args);
          const result = await toggleBlockEnabled(apiClient, input);
          return createResponse(result);
        }

        case UPDATE_BLOCK_PARENT_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            blockId: string;
            parentId: string | null;
          }>(args);
          const result = await updateBlockParent(apiClient, input);
          return createResponse(result);
        }

        case UPDATE_SUBBLOCK_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            blockId: string;
            subblockId: string;
            value: unknown;
          }>(args);
          const result = await updateSubblock(apiClient, input);
          return createResponse(result);
        }

        // Edge tools
        case ADD_EDGE_OP_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            source: string;
            target: string;
            sourceHandle?: string;
            targetHandle?: string;
            edgeId?: string;
          }>(args);
          const result = await addEdgeOp(apiClient, input);
          return createResponse(result);
        }

        case REMOVE_EDGE_OP_TOOL_NAME: {
          const input = parseToolArguments<{ workflowId: string; edgeId: string }>(args);
          const result = await removeEdgeOp(apiClient, input);
          return createResponse(result);
        }

        // Variable tools
        case ADD_VARIABLE_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            id?: string;
            name: string;
            type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'plain';
            value: unknown;
          }>(args);
          const result = await addVariable(apiClient, input);
          return createResponse(result);
        }

        case REMOVE_VARIABLE_TOOL_NAME: {
          const input = parseToolArguments<{ workflowId: string; variableId: string }>(args);
          const result = await removeVariable(apiClient, input);
          return createResponse(result);
        }

        // Subflow tools
        case UPDATE_SUBFLOW_TOOL_NAME: {
          const input = parseToolArguments<{
            workflowId: string;
            id: string;
            type?: 'loop' | 'parallel';
            config?: Record<string, unknown>;
          }>(args);
          const result = await updateSubflow(apiClient, input);
          return createResponse(result);
        }

        // Custom tools
        case LIST_CUSTOM_TOOLS_TOOL_NAME: {
          const input = parseToolArguments<{ workspaceId?: string; workflowId?: string }>(args);
          const result = await listCustomTools(apiClient, input);
          return createResponse(result);
        }

        case GET_CUSTOM_TOOL_TOOL_NAME: {
          const input = parseToolArguments<{
            workspaceId?: string;
            workflowId?: string;
            toolId: string;
          }>(args);
          const result = await getCustomTool(apiClient, input);
          return createResponse(result);
        }

        case UPSERT_CUSTOM_TOOLS_TOOL_NAME: {
          const input = parseToolArguments<{
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
          }>(args);
          const result = await upsertCustomTools(apiClient, input);
          return createResponse(result);
        }

        // Skills tools
        case LIST_SKILLS_TOOL_NAME: {
          const input = parseToolArguments<{ workspaceId: string }>(args);
          const result = await listSkills(apiClient, input);
          return createResponse(result);
        }

        case GET_SKILL_TOOL_NAME: {
          const input = parseToolArguments<{ workspaceId: string; id: string }>(args);
          const result = await getSkill(apiClient, input);
          return createResponse(result);
        }

        case CREATE_SKILL_TOOL_NAME: {
          const input = parseToolArguments<{
            workspaceId: string;
            name: string;
            description: string;
            content: string;
          }>(args);
          const result = await createSkill(apiClient, input);
          return createResponse(result);
        }

        case UPDATE_SKILL_TOOL_NAME: {
          const input = parseToolArguments<{
            workspaceId: string;
            id: string;
            name: string;
            description: string;
            content: string;
          }>(args);
          const result = await updateSkill(apiClient, input);
          return createResponse(result);
        }

        case DELETE_SKILL_TOOL_NAME: {
          const input = parseToolArguments<{ workspaceId: string; id: string }>(args);
          const result = await deleteSkill(apiClient, input);
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
