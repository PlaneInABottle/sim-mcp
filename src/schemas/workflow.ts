/**
 * Workflow Type Definitions and Schemas
 *
 * Zod schemas for validating workflow-related inputs and outputs.
 * These schemas map to sim's workflow data structures.
 */

import { z } from 'zod';

/**
 * Variable types supported by workflows
 */
export const VariableTypeSchema = z.enum(['string', 'number', 'boolean', 'object', 'array']);
export type VariableType = z.infer<typeof VariableTypeSchema>;

/**
 * Workflow variable schema
 */
export const VariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: VariableTypeSchema,
  value: z.unknown(),
  description: z.string().optional(),
});
export type Variable = z.infer<typeof VariableSchema>;

/**
 * Block output schema
 */
export const BlockOutputSchema = z.object({
  id: z.string(),
  type: z.string(),
  value: z.unknown().optional(),
});
export type BlockOutput = z.infer<typeof BlockOutputSchema>;

/**
 * Sub-block schema (nested block configuration)
 */
export const SubBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  config: z.record(z.unknown()).optional(),
});
export type SubBlock = z.infer<typeof SubBlockSchema>;

/**
 * Block schema - represents a node in the workflow
 */
export const BlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  positionX: z.number(),
  positionY: z.number(),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).optional(),
  subBlocks: z.array(SubBlockSchema).optional(),
  outputs: z.array(BlockOutputSchema).optional(),
});
export type Block = z.infer<typeof BlockSchema>;

/**
 * Edge schema - represents a connection between blocks
 */
export const EdgeSchema = z.object({
  id: z.string(),
  sourceBlockId: z.string(),
  targetBlockId: z.string(),
  sourceHandle: z.string(),
  targetHandle: z.string(),
});
export type Edge = z.infer<typeof EdgeSchema>;

/**
 * Base workflow schema - core workflow properties
 */
export const WorkflowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isDeployed: z.boolean().default(false),
  deployedAt: z.string().optional(),
  variables: z.record(VariableSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

/**
 * Workflow with full block and edge data
 */
export const WorkflowWithBlocksSchema = WorkflowSchema.extend({
  blocks: z.array(BlockSchema).optional(),
  edges: z.array(EdgeSchema).optional(),
});
export type WorkflowWithBlocks = z.infer<typeof WorkflowWithBlocksSchema>;

/**
 * Input schema for creating a workflow
 */
export const CreateWorkflowInputSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  description: z.string().optional(),
});
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowInputSchema>;

/**
 * Input schema for updating a workflow
 */
export const UpdateWorkflowInputSchema = z.object({
  name: z.string().min(1, 'Workflow name cannot be empty').optional(),
  description: z.string().optional(),
});
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowInputSchema>;

/**
 * Input schema for listing workflows
 */
export const ListWorkflowsInputSchema = z.object({
  workspaceId: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
});
export type ListWorkflowsInput = z.infer<typeof ListWorkflowsInputSchema>;

/**
 * Input schema for getting a single workflow
 */
export const GetWorkflowInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  verbose: z.boolean().optional(),
});
export type GetWorkflowInput = z.infer<typeof GetWorkflowInputSchema>;

/**
 * Input schema for deleting a workflow
 */
export const DeleteWorkflowInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
});
export type DeleteWorkflowInput = z.infer<typeof DeleteWorkflowInputSchema>;

/**
 * Input schema for executing a workflow
 */
export const ExecuteWorkflowInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  input: z.record(z.unknown()).optional(),
});
export type ExecuteWorkflowInput = z.infer<typeof ExecuteWorkflowInputSchema>;

/**
 * Output schema for workflow execution result
 */
export const ExecuteWorkflowOutputSchema = z.object({
  executionId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
  output: z.unknown().optional(),
});
export type ExecuteWorkflowOutput = z.infer<typeof ExecuteWorkflowOutputSchema>;

/**
 * Output schema for list workflows response
 */
export const ListWorkflowsOutputSchema = z.object({
  workflows: z.array(WorkflowSchema),
});
export type ListWorkflowsOutput = z.infer<typeof ListWorkflowsOutputSchema>;

/**
 * Output schema for get workflow response
 */
export const GetWorkflowOutputSchema = z.object({
  workflow: WorkflowWithBlocksSchema,
});
export type GetWorkflowOutput = z.infer<typeof GetWorkflowOutputSchema>;

/**
 * Output schema for create/update workflow response
 */
export const WorkflowOutputSchema = z.object({
  workflow: WorkflowSchema,
});
export type WorkflowOutput = z.infer<typeof WorkflowOutputSchema>;

/**
 * Output schema for delete workflow response
 */
export const DeleteWorkflowOutputSchema = z.object({
  success: z.boolean(),
});
export type DeleteWorkflowOutput = z.infer<typeof DeleteWorkflowOutputSchema>;
