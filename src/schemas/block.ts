/**
 * Block Type Definitions and Schemas
 *
 * Zod schemas for validating block-related inputs and outputs.
 * These schemas map to sim's block data structures.
 */

import { z } from 'zod';

/**
 * Block types enum - comprehensive list of supported block types
 * Based on sim's block registry (130+ types across categories)
 */
export const BlockTypeEnum = z.enum([
  // Triggers
  'api_trigger',
  'webhook',
  'schedule',
  'manual_trigger',
  'chat_trigger',
  'input_trigger',
  'start_trigger',
  'generic_webhook',

  // AI/ML
  'agent',
  'openai',
  'anthropic',
  'vision_v2',
  'stt',
  'tts',
  'evaluator',
  'thinking',

  // Integrations
  'slack',
  'github',
  'gmail',
  'notion',
  'jira',
  'linear',
  'salesforce',
  'discord',
  'twilio',
  'sendgrid',

  // Databases
  'postgresql',
  'mongodb',
  'mysql',
  'neo4j',
  'supabase',
  'pinecone',
  'qdrant',
  'redis',
  'upstash',

  // Logic
  'condition',
  'router',
  'function',
  'parallel',
  'wait',
  'response',
  'loop',
  'switch',

  // Knowledge
  'knowledge',
  'memory',
  'mcp',

  // Utilities
  'api',
  'transform',
  'code',
  'template',
  'file_v3',
  'delay',
  'merge',
  'split',
  'variables',
  'workflow_input',

  // Generic for custom blocks
  'custom',
]);

export type BlockType = z.infer<typeof BlockTypeEnum>;

/**
 * Position schema - x/y coordinates for block placement
 */
export const PositionSchema = z.object({
  x: z.number().describe('X coordinate of the block position'),
  y: z.number().describe('Y coordinate of the block position'),
});

export type Position = z.infer<typeof PositionSchema>;

/**
 * Block input port schema
 */
export const BlockInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  required: z.boolean().optional().default(false),
});

export type BlockInput = z.infer<typeof BlockInputSchema>;

/**
 * Block output port schema
 */
export const BlockOutputPortSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
});

export type BlockOutputPort = z.infer<typeof BlockOutputPortSchema>;

/**
 * Sub-block configuration schema (for nested block configuration)
 */
export const SubBlockConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  value: z.unknown().optional(),
  config: z.record(z.unknown()).optional(),
});

export type SubBlockConfig = z.infer<typeof SubBlockConfigSchema>;

/**
 * Block configuration schema - generic config object
 */
export const BlockConfigSchema = z.record(z.unknown()).optional();

export type BlockConfig = z.infer<typeof BlockConfigSchema>;

/**
 * Full block schema - represents a node in the workflow
 */
export const BlockSchema = z.object({
  id: z.string(),
  type: z.string(), // Using string to allow custom block types
  name: z.string(),
  positionX: z.number(),
  positionY: z.number(),
  enabled: z.boolean().default(true),
  config: BlockConfigSchema,
  subBlocks: z.array(SubBlockConfigSchema).optional(),
  inputs: z.array(BlockInputSchema).optional(),
  outputs: z.array(BlockOutputPortSchema).optional(),
});

export type Block = z.infer<typeof BlockSchema>;

/**
 * Input schema for adding a block to a workflow
 */
export const AddBlockInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  type: z.string().min(1, 'Block type is required'),
  name: z.string().min(1, 'Block name is required'),
  position: PositionSchema,
  config: BlockConfigSchema,
  enabled: z.boolean().optional().default(true),
});

export type AddBlockInput = z.infer<typeof AddBlockInputSchema>;

/**
 * Input schema for updating a block
 */
export const UpdateBlockInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  blockId: z.string().min(1, 'Block ID is required'),
  name: z.string().min(1).optional(),
  position: PositionSchema.optional(),
  config: BlockConfigSchema,
  enabled: z.boolean().optional(),
});

export type UpdateBlockInput = z.infer<typeof UpdateBlockInputSchema>;

/**
 * Input schema for removing a block
 */
export const RemoveBlockInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  blockId: z.string().min(1, 'Block ID is required'),
});

export type RemoveBlockInput = z.infer<typeof RemoveBlockInputSchema>;

/**
 * Output schema for add block response
 */
export const AddBlockOutputSchema = z.object({
  block: BlockSchema,
});

export type AddBlockOutput = z.infer<typeof AddBlockOutputSchema>;

/**
 * Output schema for update block response
 */
export const UpdateBlockOutputSchema = z.object({
  block: BlockSchema,
});

export type UpdateBlockOutput = z.infer<typeof UpdateBlockOutputSchema>;

/**
 * Output schema for remove block response
 */
export const RemoveBlockOutputSchema = z.object({
  success: z.boolean(),
});

export type RemoveBlockOutput = z.infer<typeof RemoveBlockOutputSchema>;

/**
 * Block data for API requests (without id)
 */
export const BlockDataSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  positionX: z.number(),
  positionY: z.number(),
  enabled: z.boolean().optional().default(true),
  config: BlockConfigSchema,
});

export type BlockData = z.infer<typeof BlockDataSchema>;

/**
 * Update block data for API requests
 */
export const UpdateBlockDataSchema = z.object({
  name: z.string().min(1).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  enabled: z.boolean().optional(),
  config: BlockConfigSchema,
});

export type UpdateBlockData = z.infer<typeof UpdateBlockDataSchema>;
