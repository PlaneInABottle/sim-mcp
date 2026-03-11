/**
 * Sim API Client
 *
 * HTTP client wrapper for communicating with the sim backend API.
 * Provides authentication, retry logic, and error handling.
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

import type { CustomTool, CustomToolInput } from '../schemas/custom-tools.js';
import type { Skill, SkillInput } from '../schemas/skills.js';
import type { Workflow, WorkflowWithBlocks } from '../schemas/workflow.js';
import { getLogger, logApiError, logRequest } from '../utils/logger.js';
import { AuthManager } from './auth.js';
import {
  AuthenticationError,
  NetworkError,
  SimApiError,
  TimeoutError,
  mapHttpError,
} from './errors.js';
import type {
  ApiResponse,
  DeployedWorkflowStateResult,
  HttpMethod,
  OperationRequest,
  OperationResponse,
  RequestOptions,
  WorkflowDeleteCheckResult,
  WorkflowDeploymentResult,
  WorkflowExportPayload,
  WorkflowState,
  WorkflowStatusResult,
} from './types.js';

/**
 * Workflow payload returned by workflow endpoints.
 */
type WorkflowApiResponse = Workflow & {
  state?: WorkflowState;
  color?: string;
  folderId?: string | null;
};

/**
 * Configuration for SimApiClient
 */
export interface SimApiClientConfig {
  /** Base URL of the sim API */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts for failed requests */
  retries?: number;
}

/**
 * Delay between retry attempts (exponential backoff base in ms)
 */
const RETRY_DELAY_BASE = 1000;

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  return RETRY_DELAY_BASE * 2 ** attempt;
}

/**
 * SimApiClient - HTTP client for sim API communication
 */
export class SimApiClient {
  private readonly client: AxiosInstance;
  private readonly authManager: AuthManager;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly baseUrl: string;

  constructor(config: SimApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout ?? 30000;
    this.retries = config.retries ?? 3;

    // Initialize auth manager
    this.authManager = new AuthManager({
      apiKey: config.apiKey,
      validateFormat: false, // Allow any format during development
    });

    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Update the API key used for authentication
   */
  setApiKey(apiKey: string): void {
    this.authManager.setApiKey(apiKey);
    getLogger().info('API key updated', {
      operation: 'set_api_key',
    });
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Build request configuration from method, path, data, and options
   */
  private buildRequestConfig(
    method: HttpMethod,
    path: string,
    data: unknown | undefined,
    options: RequestOptions | undefined
  ): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      method,
      url: path,
      timeout: options?.timeout ?? this.timeout,
      headers: {
        ...this.authManager.getHeaders(),
        ...options?.headers,
      },
    };

    // Add data for POST, PUT, PATCH requests
    if (data !== undefined && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.data = data;
    }

    // Add query params for GET, DELETE with data
    if (data !== undefined && ['GET', 'DELETE'].includes(method)) {
      config.params = data;
    }

    return config;
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(error: Error, attempt: number, maxRetries: number): boolean {
    // Don't retry authentication errors
    if (error instanceof AuthenticationError) {
      return false;
    }

    // Check if error is retryable and we have attempts remaining
    const isRetryable = error instanceof SimApiError && error.retryable;
    return isRetryable && attempt < maxRetries;
  }

  /**
   * Handle various error types from axios requests
   */
  private handleRequestError<T>(error: unknown, config: AxiosRequestConfig): SimApiError | Error {
    // Handle axios errors
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiResponse<T>>;

      // Network or timeout errors - may be retryable
      if (!axiosError.response) {
        if (axiosError.code === 'ECONNABORTED') {
          return new TimeoutError(config.timeout ?? this.timeout);
        }
        return new NetworkError(axiosError.message || 'Network error', axiosError);
      }

      // HTTP error response
      const status = axiosError.response.status;
      const apiError = axiosError.response.data?.error;

      // Handle both string and object error formats from backend
      const message = typeof apiError === 'string' 
        ? apiError 
        : apiError?.message ?? axiosError.message;
      const details = typeof apiError === 'object' ? apiError?.details : undefined;
      return mapHttpError(status, message, details);
    }

    // Return original error if not an axios error
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Process successful response and extract data
   */
  private processResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    // Handle API-level errors in successful HTTP responses
    if (response.data && !response.data.success && response.data.error) {
      throw mapHttpError(response.status, response.data.error.message, response.data.error.details);
    }
    // Return the data payload or full response
    return (response.data?.data ?? response.data) as T;
  }

  /**
   * Make an HTTP request with retry logic and error handling
   */
  async request<T>(
    method: HttpMethod,
    path: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const requestId = generateRequestId();
    const logger = getLogger();
    const startTime = Date.now();

    const config = this.buildRequestConfig(method, path, data, options);
    const maxRetries = options?.retries ?? this.retries;
    let lastError: Error | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logRequest(logger, method, path, requestId);
        const response: AxiosResponse<ApiResponse<T>> = await this.client.request(config);
        logRequest(logger, method, path, requestId, Date.now() - startTime);
        return this.processResponse(response);
      } catch (error) {
        const durationMs = Date.now() - startTime;
        lastError = this.handleRequestError<T>(error, config);

        // Log API errors with HTTP status if available
        if (axios.isAxiosError(error) && error.response) {
          logApiError(logger, lastError.message, error.response.status, requestId, {
            path,
            method,
          });
        }

        // Throw immediately for non-retryable errors
        if (lastError instanceof AuthenticationError) {
          throw lastError;
        }

        // Retry if applicable
        if (this.shouldRetry(lastError, attempt, maxRetries)) {
          const delay = getRetryDelay(attempt);
          logger.warn(`Request failed, retrying in ${delay}ms`, {
            requestId,
            attempt: attempt + 1,
            maxRetries,
            operation: 'retry',
          });
          await sleep(delay);
          continue;
        }

        // Max retries exceeded or non-retryable error
        logger.error(`Request failed after ${attempt + 1} attempts`, {
          requestId,
          durationMs,
          operation: 'request_failed',
        });
        throw lastError;
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError ?? new Error('Request failed');
  }

  /**
   * Convenience method for GET requests
   */
  async get<T>(path: string, params?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, params, options);
  }

  /**
   * Convenience method for POST requests
   */
  async post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, data, options);
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, data, options);
  }

  /**
   * Convenience method for PATCH requests
   */
  async patch<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, data, options);
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T>(path: string, params?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, params, options);
  }

  // ==========================================
  // Workflow API Methods
  // ==========================================

  /**
   * List workflows for the authenticated user
   *
   * @param params - Optional filtering and pagination parameters
   * @returns Array of workflows
   */
  async listWorkflows(params?: {
    workspaceId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Workflow[]> {
    const queryParams: Record<string, string | number> = {};

    if (params?.workspaceId) {
      queryParams.workspaceId = params.workspaceId;
    }
    if (params?.limit !== undefined) {
      queryParams.limit = params.limit;
    }
    if (params?.offset !== undefined) {
      queryParams.offset = params.offset;
    }

    // get() auto-unwraps { data: ... } response
    const workflows = await this.get<Workflow[]>(
      '/api/workflows',
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );

    return Array.isArray(workflows) ? workflows : [];
  }

  /**
   * Get a single workflow with full details including blocks and edges
   *
   * @param workflowId - The workflow ID
   * @returns Workflow with blocks and edges
   */
  async getWorkflow(workflowId: string): Promise<WorkflowWithBlocks> {
    // get() auto-unwraps { data: ... } response, so wf is the workflow object directly
    const wf = await this.get<WorkflowApiResponse>(`/api/workflows/${workflowId}`);

    // User API returns normalized state (blocks as record, edges array) under `state`.
    // Extract and flatten blocks/edges to top level, exclude state from result
    const { state, ...workflowMeta } = wf;
    const blocks = Object.values((state?.blocks ?? {}) as Record<string, unknown>);
    const edges = (state?.edges ?? []) as unknown[];

    return { ...workflowMeta, blocks, edges } as WorkflowWithBlocks;
  }

  /**
   * Create a new workflow
   *
   * @param data - Workflow creation data
   * @returns Newly created workflow
   */
  async createWorkflow(data: {
    name: string;
    description?: string;
    workspaceId: string;
    color?: string;
    folderId?: string;
    sortOrder?: number;
  }): Promise<Workflow> {
    // post() auto-unwraps { data: ... } response
    return await this.post<Workflow>('/api/workflows', data);
  }

  /**
   * Update a workflow's metadata
   *
   * @param workflowId - The workflow ID
   * @param data - Update data (name, description)
   * @returns Updated workflow
   */
  async updateWorkflow(
    workflowId: string,
    data: { name?: string; description?: string }
  ): Promise<Workflow> {
    // put() auto-unwraps { data: ... } response
    return await this.put<Workflow>(`/api/workflows/${workflowId}`, data);
  }

  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatusResult> {
    return this.get<WorkflowStatusResult>(`/api/workflows/${workflowId}/status`);
  }

  async getDeployedWorkflowState(workflowId: string): Promise<DeployedWorkflowStateResult> {
    return this.get<DeployedWorkflowStateResult>(`/api/workflows/${workflowId}/deployed`);
  }

  async deployWorkflow(workflowId: string): Promise<WorkflowDeploymentResult> {
    return this.post<WorkflowDeploymentResult>(`/api/workflows/${workflowId}/deploy`);
  }

  async undeployWorkflow(workflowId: string): Promise<WorkflowDeploymentResult> {
    return this.delete<WorkflowDeploymentResult>(`/api/workflows/${workflowId}/deploy`);
  }

  async deleteWorkflow(options: {
    workflowId: string;
    checkTemplates?: boolean;
    templateAction?: 'delete' | 'orphan';
  }): Promise<WorkflowDeleteCheckResult | undefined> {
    const query: Record<string, string> = {};

    if (options.checkTemplates) {
      query['check-templates'] = 'true';
    }

    if (options.templateAction) {
      query.deleteTemplates = options.templateAction === 'delete' ? 'delete' : 'false';
    }

    return this.delete<WorkflowDeleteCheckResult | undefined>(
      `/api/workflows/${options.workflowId}`,
      query
    );
  }

  // ==========================================
  // Workflow Operations API Methods
  // ==========================================

  /**
   * Execute a workflow operation via the operations endpoint
   * This is the primary method for mutating workflow state (blocks, edges, etc.)
   *
   * @param workflowId - The workflow ID
   * @param operation - Operation type (e.g., 'batch-add-blocks', 'add', 'remove')
   * @param target - Target type (e.g., 'blocks', 'block', 'edge', 'workflow', 'variable', 'subflow', 'subblock')
   * @param payload - Operation-specific payload data
   * @param options - Optional settings for broadcast and timestamp
   * @returns Operation response with success status and operation ID
   */
  async workflowOperation(
    workflowId: string,
    operation: string,
    target: string,
    payload: Record<string, unknown>,
    options?: { broadcast?: boolean; timestamp?: number }
  ): Promise<OperationResponse> {
    const request: OperationRequest = {
      operation,
      target,
      payload,
      timestamp: options?.timestamp,
      broadcast: options?.broadcast,
    };

    return this.post<OperationResponse>(`/api/workflows/${workflowId}/operations`, request);
  }

  // ==========================================
  // Type-Safe Operation Helpers
  // ==========================================

  /**
   * Add blocks to a workflow (batch operation)
   *
   * @param workflowId - The workflow ID
   * @param blocks - Array of blocks to add
   * @param options - Optional loops, parallels, and subBlockValues
   * @returns Operation response
   */
  async addBlocks(
    workflowId: string,
    blocks: Array<Record<string, unknown>>,
    edges?: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
      type?: string;
    }>,
    options?: {
      loops?: Record<string, unknown>;
      parallels?: Record<string, unknown>;
      subBlockValues?: Record<string, Record<string, unknown>>;
    }
  ): Promise<OperationResponse> {
    return this.workflowOperation(workflowId, 'batch-add-blocks', 'blocks', {
      blocks,
      edges,
      loops: options?.loops,
      parallels: options?.parallels,
      subBlockValues: options?.subBlockValues,
    });
  }

  /**
   * Remove blocks from a workflow (batch operation)
   *
   * @param workflowId - The workflow ID
   * @param blockIds - Array of block IDs to remove
   * @returns Operation response
   */
  async removeBlocks(workflowId: string, blockIds: string[]): Promise<OperationResponse> {
    return this.workflowOperation(workflowId, 'batch-remove-blocks', 'blocks', {
      ids: blockIds,
    });
  }

  /**
   * Update a block's display name
   *
   * @param workflowId - The workflow ID
   * @param blockId - The block ID
   * @param name - New display name
   * @returns Operation response
   */
  async updateBlockName(
    workflowId: string,
    blockId: string,
    name: string
  ): Promise<OperationResponse> {
    return this.workflowOperation(workflowId, 'update-name', 'block', {
      id: blockId,
      name,
    });
  }

  /**
   * Toggle a block's enabled state
   *
   * @param workflowId - The workflow ID
   * @param blockId - The block ID
   * @param enabled - Whether the block should be enabled
   * @returns Operation response
   */
  async toggleBlockEnabled(
    workflowId: string,
    blockId: string,
    enabled: boolean
  ): Promise<OperationResponse> {
    return this.workflowOperation(workflowId, 'toggle-enabled', 'block', {
      id: blockId,
      enabled,
    });
  }

  /**
   * Update a block's parent container
   *
   * @param workflowId - The workflow ID
   * @param blockId - The block ID
   * @param parentId - Parent container ID (loop/parallel) or null to remove
   * @returns Operation response
   */
  async updateBlockParent(
    workflowId: string,
    blockId: string,
    parentId: string | null
  ): Promise<OperationResponse> {
    return this.workflowOperation(workflowId, 'update-parent', 'block', {
      id: blockId,
      parentId,
    });
  }

  /**
   * Add an edge via operations endpoint
   *
   * @param workflowId - The workflow ID
   * @param edge - Edge data (id, source, target, handles)
   * @returns Operation response
   */
  async addEdgeOperation(
    workflowId: string,
    edge: {
      id: string;
      source: string;
      target: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    }
  ): Promise<OperationResponse> {
    return this.workflowOperation(workflowId, 'add', 'edge', edge);
  }

  /**
   * Remove an edge via operations endpoint
   *
   * @param workflowId - The workflow ID
   * @param edgeId - The edge ID to remove
   * @returns Operation response
   */
  async removeEdgeOperation(workflowId: string, edgeId: string): Promise<OperationResponse> {
    return this.workflowOperation(workflowId, 'remove', 'edge', { id: edgeId });
  }

  /**
   * Replace entire workflow state
   *
   * @param workflowId - The workflow ID
   * @param state - Complete workflow state to replace with
   * @returns Operation response
   */
  async replaceWorkflowState(
    workflowId: string,
    state: Record<string, unknown>
  ): Promise<OperationResponse> {
    return this.workflowOperation(workflowId, 'replace-state', 'workflow', {
      state,
    });
  }

  /**
   * Add a workflow variable
   *
   * @param workflowId - The workflow ID
   * @param variable - Variable data (id, name, type, value)
   * @returns Operation response
   */
  async addVariable(
    workflowId: string,
    variable: {
      id: string;
      name: string;
      type: string;
      value: unknown;
    }
  ): Promise<OperationResponse> {
    return this.workflowOperation(workflowId, 'add', 'variable', {
      ...variable,
      workflowId,
    });
  }

  /**
   * Remove a workflow variable
   *
   * @param workflowId - The workflow ID
   * @param variableId - The variable ID to remove
   * @returns Operation response
   */
  async removeVariable(workflowId: string, variableId: string): Promise<OperationResponse> {
    return this.workflowOperation(workflowId, 'remove', 'variable', {
      variableId,
    });
  }

  /**
   * Add or update a subflow (loop or parallel)
   *
   * @param workflowId - The workflow ID
   * @param subflow - Subflow data (id, type, config)
   * @param operation - 'add', 'update', or 'remove'
   * @returns Operation response
   */
  async subflowOperation(
    workflowId: string,
    subflow: {
      id: string;
      type?: 'loop' | 'parallel';
      config?: Record<string, unknown>;
    }
  ): Promise<OperationResponse> {
    // Subflows in sim backend only use 'update' operation
    // NOTE: Subflows must already exist (created via addBlocks with type loop/parallel)
    return this.workflowOperation(workflowId, 'update', 'subflow', subflow);
  }

  // ==========================================
  // Workflow Execution API Methods
  // ==========================================

  /**
   * Execute a workflow
   *
   * @param workflowId - The workflow ID to execute
   * @param options - Execution options (input, triggerType, useDraftState)
   * @returns Execution result with output data
   */
  async executeWorkflow(
    workflowId: string,
    options?: {
      input?: Record<string, unknown>;
      triggerType?: string;
      useDraftState?: boolean;
    }
  ): Promise<{
    success: boolean;
    executionId?: string;
    output?: unknown;
    error?: string;
    metadata?: {
      duration?: number;
      startTime?: string;
      endTime?: string;
    };
  }> {
    const body: Record<string, unknown> = {};

    if (options?.input) {
      body.input = options.input;
    }
    if (options?.triggerType) {
      body.triggerType = options.triggerType;
    }
    if (options?.useDraftState !== undefined) {
      body.useDraftState = options.useDraftState;
    }

    return this.post(`/api/workflows/${workflowId}/execute`, body, {
      timeout: 120000, // Workflow execution may take longer
    });
  }

  // ==========================================
  // Execution Logs API Methods
  // ==========================================

  /**
   * List and filter workflow execution logs
   *
   * @param params - Filter and pagination parameters
   * @returns Array of execution logs with pagination info
   */
  async getLogs(params: {
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
  }): Promise<{
    data: Array<Record<string, unknown>>;
    nextCursor?: string;
    limits?: Record<string, unknown>;
  }> {
    const queryParams: Record<string, string | number | boolean> = {
      workspaceId: params.workspaceId,
    };

    if (params.workflowId) {
      queryParams.workflowIds = params.workflowId;
    }
    if (params.executionId) {
      queryParams.executionId = params.executionId;
    }
    if (params.level) {
      queryParams.level = params.level;
    }
    if (params.startDate) {
      queryParams.startDate = params.startDate;
    }
    if (params.endDate) {
      queryParams.endDate = params.endDate;
    }
    if (params.minDurationMs !== undefined) {
      queryParams.minDurationMs = params.minDurationMs;
    }
    if (params.maxDurationMs !== undefined) {
      queryParams.maxDurationMs = params.maxDurationMs;
    }
    if (params.minCost !== undefined) {
      queryParams.minCost = params.minCost;
    }
    if (params.maxCost !== undefined) {
      queryParams.maxCost = params.maxCost;
    }
    if (params.trigger) {
      queryParams.triggers = params.trigger;
    }
    if (params.limit !== undefined) {
      queryParams.limit = params.limit;
    }
    if (params.cursor) {
      queryParams.cursor = params.cursor;
    }
    if (params.order) {
      queryParams.order = params.order;
    }
    if (params.details) {
      queryParams.details = params.details;
    }
    if (params.includeTraceSpans !== undefined) {
      queryParams.includeTraceSpans = params.includeTraceSpans;
    }
    if (params.includeFinalOutput !== undefined) {
      queryParams.includeFinalOutput = params.includeFinalOutput;
    }

    return this.get<{
      data: Array<Record<string, unknown>>;
      nextCursor?: string;
      limits?: Record<string, unknown>;
    }>('/api/v1/logs', queryParams);
  }

  /**
   * Get full detail for a specific execution log
   *
   * @param logId - The execution log ID
   * @returns Full log detail with execution data, workflow context, and cost breakdown
   */
  async getLogDetail(logId: string): Promise<{
    data: Record<string, unknown>;
    limits?: Record<string, unknown>;
  }> {
    return this.get<{
      data: Record<string, unknown>;
      limits?: Record<string, unknown>;
    }>(`/api/v1/logs/${logId}`);
  }

  // ==========================================
  // Import/Export API Methods
  // ==========================================

  /**
   * Export a workflow as JSON
   *
   * @param workflowId - The workflow ID to export
   * @returns Complete workflow export payload
   */
  async exportWorkflow(workflowId: string): Promise<WorkflowExportPayload> {
    // get() auto-unwraps { data: ... } response
    const wf = await this.get<WorkflowApiResponse>(`/api/workflows/${workflowId}`);

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      workflow: {
        id: wf.id,
        name: wf.name,
        description: wf.description,
        color: wf.color,
        workspaceId: wf.workspaceId,
        folderId: wf.folderId ?? undefined,
      },
      state: wf.state,
    } as WorkflowExportPayload;
  }

  // ==========================================
  // Custom Tools API Methods
  // ==========================================

  /**
   * List custom tools for a workspace
   *
   * @param params - Filter parameters (workspaceId or workflowId)
   * @returns Array of custom tools
   */
  async listCustomTools(params?: {
    workspaceId?: string;
    workflowId?: string;
  }): Promise<CustomTool[]> {
    const queryParams: Record<string, string> = {};

    if (params?.workspaceId) {
      queryParams.workspaceId = params.workspaceId;
    }
    if (params?.workflowId) {
      queryParams.workflowId = params.workflowId;
    }

    // get() auto-unwraps { data: ... } response
    const tools = await this.get<CustomTool[]>(
      '/api/tools/custom',
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );

    return Array.isArray(tools) ? tools : [];
  }

  /**
   * Create or update custom tools in a workspace
   *
   * @param params - Tools data and workspace ID
   * @returns Array of all custom tools in the workspace after upsert
   */
  async upsertCustomTools(params: {
    workspaceId: string;
    tools: CustomToolInput[];
  }): Promise<CustomTool[]> {
    const response = await this.post<CustomTool[] | { data: CustomTool[] }>('/api/tools/custom', {
      workspaceId: params.workspaceId,
      tools: params.tools,
    });

    // Response may be wrapped in { success, data } format or be a direct array
    if (Array.isArray(response)) {
      return response;
    }
    return response.data ?? [];
  }

  // ==========================================
  // Skills API Methods
  // ==========================================

  /**
   * List skills for a workspace
   *
   * @param params - Filter parameters (workspaceId required)
   * @returns Array of skills
   */
  async listSkills(params: { workspaceId: string }): Promise<Skill[]> {
    const queryParams: Record<string, string> = {
      workspaceId: params.workspaceId,
    };

    // get() auto-unwraps { data: ... } response
    const skills = await this.get<Skill[]>(
      '/api/skills',
      queryParams
    );

    return Array.isArray(skills) ? skills : [];
  }

  /**
   * Create or update skills in a workspace (upsert)
   *
   * @param params - Skills data and workspace ID
   * @returns Array of created/updated skills
   */
  async upsertSkills(params: {
    workspaceId: string;
    skills: SkillInput[];
  }): Promise<Skill[]> {
    const response = await this.post<Skill[] | { data: Skill[] }>('/api/skills', {
      workspaceId: params.workspaceId,
      skills: params.skills,
    });

    // Response may be wrapped in { success, data } format or be a direct array
    if (Array.isArray(response)) {
      return response;
    }
    return response.data ?? [];
  }

  /**
   * Delete a skill from a workspace
   *
   * @param params - Skill ID and workspace ID
   */
  async deleteSkill(params: { id: string; workspaceId: string }): Promise<void> {
    await this.delete<void>('/api/skills', {
      id: params.id,
      workspaceId: params.workspaceId,
    });
  }
}

/**
 * Factory function to create a SimApiClient instance
 */
export function createSimApiClient(config: SimApiClientConfig): SimApiClient {
  return new SimApiClient(config);
}
