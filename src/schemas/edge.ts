/**
 * Edge Type Definitions and Schemas
 *
 * Zod schemas for validating edge-related inputs and outputs.
 * Edges represent connections between blocks in a workflow.
 */

import { z } from 'zod';

/**
 * Edge handle types
 */
export const EdgeHandleTypeSchema = z.enum(['input', 'output', 'default', 'source', 'target']);

export type EdgeHandleType = z.infer<typeof EdgeHandleTypeSchema>;

/**
 * Full edge schema - represents a connection between blocks
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
 * Input schema for adding an edge to a workflow
 */
export const AddEdgeInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  sourceBlockId: z.string().min(1, 'Source block ID is required'),
  targetBlockId: z.string().min(1, 'Target block ID is required'),
  sourceHandle: z.string().optional().default('output'),
  targetHandle: z.string().optional().default('input'),
});

export type AddEdgeInput = z.infer<typeof AddEdgeInputSchema>;

/**
 * Input schema for removing an edge
 */
export const RemoveEdgeInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  edgeId: z.string().min(1, 'Edge ID is required'),
});

export type RemoveEdgeInput = z.infer<typeof RemoveEdgeInputSchema>;

/**
 * Output schema for add edge response
 */
export const AddEdgeOutputSchema = z.object({
  edge: EdgeSchema,
});

export type AddEdgeOutput = z.infer<typeof AddEdgeOutputSchema>;

/**
 * Output schema for remove edge response
 */
export const RemoveEdgeOutputSchema = z.object({
  success: z.boolean(),
});

export type RemoveEdgeOutput = z.infer<typeof RemoveEdgeOutputSchema>;

/**
 * Edge data for API requests (without id)
 */
export const EdgeDataSchema = z.object({
  sourceBlockId: z.string().min(1),
  targetBlockId: z.string().min(1),
  sourceHandle: z.string().default('output'),
  targetHandle: z.string().default('input'),
});

export type EdgeData = z.infer<typeof EdgeDataSchema>;
