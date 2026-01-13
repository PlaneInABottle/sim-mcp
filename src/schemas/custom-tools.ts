/**
 * Custom Tools Schemas
 *
 * Type definitions for custom tools in the sim API.
 */

import { z } from 'zod';

/**
 * Schema for function parameters within a tool
 */
export const FunctionParametersSchema = z.object({
  type: z.string(),
  properties: z.record(z.any()),
  required: z.array(z.string()).optional(),
});

/**
 * Schema for function definition within a tool
 */
export const FunctionDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parameters: FunctionParametersSchema,
});

/**
 * Schema for tool schema (contains function definition)
 */
export const ToolSchemaDefinitionSchema = z.object({
  type: z.literal('function'),
  function: FunctionDefinitionSchema,
});

/**
 * Schema for a custom tool from the API
 */
export const CustomToolSchema = z.object({
  id: z.string(),
  workspaceId: z.string().nullable(),
  userId: z.string(),
  title: z.string(),
  schema: ToolSchemaDefinitionSchema,
  code: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Schema for custom tool input (for create/update)
 */
export const CustomToolInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  schema: ToolSchemaDefinitionSchema,
  code: z.string(),
});

/**
 * Inferred types from schemas
 */
export type FunctionParameters = z.infer<typeof FunctionParametersSchema>;
export type FunctionDefinition = z.infer<typeof FunctionDefinitionSchema>;
export type ToolSchemaDefinition = z.infer<typeof ToolSchemaDefinitionSchema>;
export type CustomTool = z.infer<typeof CustomToolSchema>;
export type CustomToolInput = z.infer<typeof CustomToolInputSchema>;
