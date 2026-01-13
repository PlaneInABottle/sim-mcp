/**
 * Schema Module
 *
 * Exports all Zod schemas and type definitions for the sim-mcp server.
 */

// Workflow schemas
export {
  // Types
  BlockOutputSchema,
  BlockSchema,
  CreateWorkflowInputSchema,
  DeleteWorkflowInputSchema,
  DeleteWorkflowOutputSchema,
  EdgeSchema,
  ExecuteWorkflowInputSchema,
  ExecuteWorkflowOutputSchema,
  GetWorkflowInputSchema,
  GetWorkflowOutputSchema,
  ListWorkflowsInputSchema,
  ListWorkflowsOutputSchema,
  SubBlockSchema,
  UpdateWorkflowInputSchema,
  VariableSchema,
  VariableTypeSchema,
  WorkflowOutputSchema,
  WorkflowSchema,
  WorkflowWithBlocksSchema,
} from './workflow.js';

export type {
  Block,
  BlockOutput,
  CreateWorkflowInput,
  DeleteWorkflowInput,
  DeleteWorkflowOutput,
  Edge,
  ExecuteWorkflowInput,
  ExecuteWorkflowOutput,
  GetWorkflowInput,
  GetWorkflowOutput,
  ListWorkflowsInput,
  ListWorkflowsOutput,
  SubBlock,
  UpdateWorkflowInput,
  Variable,
  VariableType,
  Workflow,
  WorkflowOutput,
  WorkflowWithBlocks,
} from './workflow.js';

// Block schemas
export {
  AddBlockInputSchema,
  AddBlockOutputSchema,
  BlockConfigSchema,
  BlockDataSchema,
  BlockInputSchema,
  BlockOutputPortSchema,
  BlockSchema as BlockFullSchema,
  BlockTypeEnum,
  PositionSchema,
  RemoveBlockInputSchema,
  RemoveBlockOutputSchema,
  SubBlockConfigSchema,
  UpdateBlockDataSchema,
  UpdateBlockInputSchema,
  UpdateBlockOutputSchema,
} from './block.js';

export type {
  AddBlockInput,
  AddBlockOutput,
  Block as BlockFull,
  BlockConfig,
  BlockData,
  BlockInput,
  BlockOutputPort,
  BlockType,
  Position,
  RemoveBlockInput,
  RemoveBlockOutput,
  SubBlockConfig,
  UpdateBlockData,
  UpdateBlockInput,
  UpdateBlockOutput,
} from './block.js';

// Edge schemas
export {
  AddEdgeInputSchema,
  AddEdgeOutputSchema,
  EdgeDataSchema,
  EdgeHandleTypeSchema,
  EdgeSchema as EdgeFullSchema,
  RemoveEdgeInputSchema,
  RemoveEdgeOutputSchema,
} from './edge.js';

export type {
  AddEdgeInput,
  AddEdgeOutput,
  Edge as EdgeFull,
  EdgeData,
  EdgeHandleType,
  RemoveEdgeInput,
  RemoveEdgeOutput,
} from './edge.js';

// Operations schemas (new operation-based tools)
export {
  // Export/Import
  ExportWorkflowInputSchema,
  exportWorkflowJsonSchema,
  // Block operations
  AddBlocksInputSchema,
  addBlocksJsonSchema,
  RemoveBlocksInputSchema,
  removeBlocksJsonSchema,
  UpdateBlockNameInputSchema,
  updateBlockNameJsonSchema,
  ToggleBlockEnabledInputSchema,
  toggleBlockEnabledJsonSchema,
  // Edge operations
  AddEdgeOpInputSchema,
  addEdgeOpJsonSchema,
  RemoveEdgeOpInputSchema,
  removeEdgeOpJsonSchema,
  // Workflow state operations
  ReplaceWorkflowStateInputSchema,
  replaceWorkflowStateJsonSchema,
  // Variable operations
  AddVariableInputSchema,
  addVariableJsonSchema,
  RemoveVariableInputSchema,
  removeVariableJsonSchema,
  // Subflow operations
  AddSubflowInputSchema,
  addSubflowJsonSchema,
  UpdateSubflowInputSchema,
  updateSubflowJsonSchema,
  // Common schemas
  PositionSchema as OpPositionSchema,
  AutoConnectEdgeSchema,
  BlockDataForAddSchema,
  OperationResponseSchema,
} from './operations.js';

export type {
  ExportWorkflowInput,
  AddBlocksInput,
  RemoveBlocksInput,
  UpdateBlockNameInput,
  ToggleBlockEnabledInput,
  AddEdgeOpInput,
  RemoveEdgeOpInput,
  ReplaceWorkflowStateInput,
  AddVariableInput,
  RemoveVariableInput,
  AddSubflowInput,
  UpdateSubflowInput,
  Position as OpPosition,
  AutoConnectEdge,
  BlockDataForAdd,
  OperationResponseType,
} from './operations.js';

// Custom tools schemas
export {
  CustomToolSchema,
  CustomToolInputSchema,
  FunctionDefinitionSchema,
  FunctionParametersSchema,
  ToolSchemaDefinitionSchema,
} from './custom-tools.js';

export type {
  CustomTool,
  CustomToolInput,
  FunctionDefinition,
  FunctionParameters,
  ToolSchemaDefinition,
} from './custom-tools.js';
