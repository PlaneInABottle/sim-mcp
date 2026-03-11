/**
 * API Types
 *
 * Type definitions for sim API requests and responses.
 * These types map to the sim backend API structure.
 */

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Common API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Request options for API calls
 */
export interface RequestOptions {
  /** Request timeout override in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Number of retries for this request */
  retries?: number;
  /** Whether to skip authentication */
  skipAuth?: boolean;
}

/**
 * Base resource with common fields
 */
export interface BaseResource {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Workflow resource type
 */
export interface Workflow extends BaseResource {
  name: string;
  description?: string;
  userId: string;
  workspaceId: string;
  isDeployed: boolean;
  deployedAt?: string;
  variables?: Record<string, WorkflowVariable>;
}

/**
 * Workflow variable type
 */
export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  value: unknown;
}

/**
 * Block position in workflow canvas
 */
export interface BlockPosition {
  x: number;
  y: number;
}

/**
 * Workflow block resource type
 */
export interface Block extends BaseResource {
  workflowId: string;
  type: string;
  name: string;
  position: BlockPosition;
  enabled: boolean;
  subBlocks?: SubBlock[];
  outputs?: BlockOutput[];
}

/**
 * Sub-block within a block
 */
export interface SubBlock {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

/**
 * Block output definition
 */
export interface BlockOutput {
  id: string;
  type: string;
  value?: unknown;
}

/**
 * Workflow edge (connection between blocks)
 */
export interface Edge extends BaseResource {
  workflowId: string;
  sourceBlockId: string;
  targetBlockId: string;
  sourceHandle: string;
  targetHandle: string;
}

/**
 * Workflow execution status
 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Workflow execution resource
 */
export interface Execution extends BaseResource {
  workflowId: string;
  status: ExecutionStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

/**
 * Knowledge base resource
 */
export interface KnowledgeBase extends BaseResource {
  name: string;
  description?: string;
  userId: string;
  workspaceId: string;
  embeddingModel: string;
  documentCount: number;
}

/**
 * Document in a knowledge base
 */
export interface Document extends BaseResource {
  knowledgeBaseId: string;
  filename: string;
  contentType: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Search result from knowledge base
 */
export interface SearchResult {
  documentId: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * API key resource
 */
export interface ApiKey extends BaseResource {
  name: string;
  userId: string;
  workspaceId: string;
  type: 'read' | 'write' | 'admin';
  lastUsedAt?: string;
}

/**
 * Request input for creating a workflow
 */
export interface CreateWorkflowInput {
  name: string;
  description?: string;
  workspaceId: string;
}

/**
 * Request input for updating a workflow
 */
export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
}

/**
 * Request input for adding a block
 */
export interface AddBlockInput {
  type: string;
  name: string;
  position: BlockPosition;
  config?: Record<string, unknown>;
}

/**
 * Request input for updating a block
 */
export interface UpdateBlockInput {
  name?: string;
  position?: BlockPosition;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

/**
 * Request input for adding an edge
 */
export interface AddEdgeInput {
  sourceBlockId: string;
  targetBlockId: string;
  sourceHandle: string;
  targetHandle: string;
}

/**
 * Request input for executing a workflow
 */
export interface ExecuteWorkflowInput {
  input?: Record<string, unknown>;
  async?: boolean;
}

/**
 * Response from workflow execution
 */
export interface ExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  output?: Record<string, unknown>;
}

/**
 * Deploy workflow result
 */
export interface DeployResult {
  success: boolean;
  apiEndpoint: string;
  deployedAt: string;
}

export interface WorkflowStatusResult {
  isDeployed: boolean;
  deployedAt: string | null;
  isPublished?: boolean;
  needsRedeployment: boolean;
}

export interface DeployedWorkflowStateResult {
  deployedState: WorkflowState | null;
}

export interface WorkflowDeploymentResult {
  apiKey: string | null;
  isDeployed: boolean;
  deployedAt: string | null;
  needsRedeployment?: boolean;
  isPublicApi?: boolean;
  schedule?: {
    id: string;
    cronExpression?: string;
    nextRunAt?: Date | string;
  };
  warnings?: string[];
}

export interface WorkflowDeleteTemplateSummary {
  id: string;
  name: string;
  views: number;
  stars: number;
}

export interface WorkflowDeleteCheckResult {
  hasPublishedTemplates: boolean;
  count: number;
  publishedTemplates: WorkflowDeleteTemplateSummary[];
}

// ==========================================
// Workflow Operations Types
// ==========================================

/**
 * Request body for workflow operations endpoint
 * POST /api/workflows/{id}/operations
 */
export interface OperationRequest {
  /** Operation type (e.g., 'batch-add-blocks', 'add', 'remove', 'update-name') */
  operation: string;
  /** Target type (e.g., 'blocks', 'block', 'edge', 'workflow', 'variable', 'subflow', 'subblock') */
  target: string;
  /** Operation-specific payload */
  payload: Record<string, unknown>;
  /** Optional timestamp (defaults to Date.now()) */
  timestamp?: number;
  /** Whether to broadcast to WebSocket clients (defaults to true) */
  broadcast?: boolean;
}

/**
 * Response from workflow operations endpoint
 */
export interface OperationResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** Unique ID for this operation */
  operationId: string;
  /** Timestamp when operation was processed */
  timestamp: number;
  /** Whether WebSocket broadcast was sent */
  broadcastSent: boolean;
  /** Accurate count of blocks actually removed (for batch remove operations) */
  blocksRemoved?: number;
  /** Warnings for non-existent or otherwise skipped IDs */
  warnings?: string[];
}

/**
 * Workflow state for import/export
 */
export interface WorkflowState {
  blocks: Record<string, unknown>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    type?: string;
  }>;
  loops: Record<string, unknown>;
  parallels: Record<string, unknown>;
  metadata?: {
    name?: string;
    description?: string;
    color?: string;
    exportedAt?: string;
  };
  variables?: Array<{
    id: string;
    name: string;
    type: string;
    value: unknown;
  }>;
}

/**
 * Workflow export payload returned by export endpoint
 */
export interface WorkflowExportPayload {
  /** Export format version */
  version: string;
  /** When the export was created */
  exportedAt: string;
  /** Workflow metadata */
  workflow: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    workspaceId: string;
    folderId?: string | null;
  };
  /** Full workflow state */
  state: WorkflowState;
}

/**
 * Request to import a workflow
 */
export interface ImportWorkflowRequest {
  /** Target workspace ID */
  workspaceId: string;
  /** Optional folder ID to place the workflow in */
  folderId?: string;
  /** Optional name override (uses metadata name if not provided) */
  name?: string;
  /** The workflow data to import */
  workflow: WorkflowState;
}

/**
 * Response from workflow import
 */
export interface ImportWorkflowResponse {
  /** ID of the newly created workflow */
  workflowId: string;
  /** Name of the created workflow */
  name: string;
  /** Whether the import was successful */
  success: boolean;
}
