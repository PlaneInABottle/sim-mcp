/**
 * Client Module
 *
 * Exports all client-related functionality for the sim-mcp server.
 */

// API Client
export { SimApiClient, createSimApiClient } from './sim-api-client.js';
export type { SimApiClientConfig } from './sim-api-client.js';

// Authentication
export {
  AUTH_HEADER,
  AuthManager,
  BEARER_HEADER,
  createAuthHeaders,
  createBearerHeaders,
  isValidApiKeyFormat,
  maskApiKey,
} from './auth.js';
export type { AuthConfig } from './auth.js';

// Error Types
export {
  AuthenticationError,
  AuthorizationError,
  formatMcpError,
  InternalError,
  isRetryableError,
  mapHttpError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  SimApiError,
  SimErrorCode,
  TimeoutError,
  ValidationError,
} from './errors.js';
export type { ErrorDetails } from './errors.js';

// Types
export type {
  AddBlockInput,
  AddEdgeInput,
  ApiKey,
  ApiResponse,
  BaseResource,
  Block,
  BlockOutput,
  BlockPosition,
  CreateWorkflowInput,
  DeployResult,
  Document,
  Edge,
  ExecuteWorkflowInput,
  Execution,
  ExecutionResult,
  ExecutionStatus,
  HttpMethod,
  KnowledgeBase,
  PaginatedResponse,
  PaginationParams,
  RequestOptions,
  SearchResult,
  SubBlock,
  UpdateBlockInput,
  UpdateWorkflowInput,
  Workflow,
  WorkflowVariable,
} from './types.js';
