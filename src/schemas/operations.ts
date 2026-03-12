/**
 * Operations Schemas
 *
 * Zod schemas for validating workflow operation inputs and outputs.
 * These schemas are used by the new operation-based tools.
 */

import { z } from 'zod'

// ==========================================
// Common Schemas
// ==========================================

/**
 * Position schema for block placement
 */
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})
export type Position = z.infer<typeof PositionSchema>

// ==========================================
// Export/Import Schemas
// ==========================================

/**
 * Export workflow input schema
 */
export const ExportWorkflowInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
})
export type ExportWorkflowInput = z.infer<typeof ExportWorkflowInputSchema>

/**
 * Export workflow JSON Schema for MCP registration
 */
export const exportWorkflowJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow to export',
    },
  },
  required: ['workflowId'],
}

// ==========================================
// Block Operation Schemas
// ==========================================

/**
 * Block data schema for add_blocks
 */
export const BlockDataForAddSchema = z.object({
  id: z.string().optional(), // Auto-generate if not provided
  type: z.string().min(1, 'Block type is required'),
  name: z.string().min(1, 'Block name is required'),
  position: PositionSchema,
  data: z.record(z.unknown()).optional(),
  subBlocks: z.record(z.unknown()).optional(),
  outputs: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional().default(true),
})
export type BlockDataForAdd = z.infer<typeof BlockDataForAddSchema>

/**
 * Add blocks input schema
 */
export const AddBlocksInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  blocks: z.array(BlockDataForAddSchema).min(1, 'At least one block is required'),
  loops: z.record(z.unknown()).optional(),
  parallels: z.record(z.unknown()).optional(),
  subBlockValues: z.record(z.record(z.unknown())).optional(),
})
export type AddBlocksInput = z.infer<typeof AddBlocksInputSchema>

/**
 * Add blocks JSON Schema for MCP registration
 */
export const addBlocksJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow to add blocks to',
    },
    blocks: {
      type: 'array',
      description: 'Array of blocks to add',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Optional block ID (auto-generated if not provided)',
          },
          type: {
            type: 'string',
            description: 'Block type (e.g., agent, api_trigger, condition, api)',
          },
          name: {
            type: 'string',
            description: 'Display name for the block',
          },
          position: {
            type: 'object',
            description: 'Position on the canvas',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
            required: ['x', 'y'],
          },
          data: {
            type: 'object',
            description: 'Block configuration data',
          },
          enabled: {
            type: 'boolean',
            description: 'Whether the block is enabled (default: true)',
          },
        },
        required: ['type', 'name', 'position'],
      },
    },
  },
  required: ['workflowId', 'blocks'],
}

/**
 * Remove blocks input schema
 */
export const RemoveBlocksInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  blockIds: z.array(z.string().min(1)).min(1, 'At least one block ID is required'),
})
export type RemoveBlocksInput = z.infer<typeof RemoveBlocksInputSchema>

/**
 * Remove blocks JSON Schema for MCP registration
 */
export const removeBlocksJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow to remove blocks from',
    },
    blockIds: {
      type: 'array',
      description: 'Array of block IDs to remove',
      items: { type: 'string' },
    },
  },
  required: ['workflowId', 'blockIds'],
}

/**
 * Update block position input schema
 */
/**
 * Update block name input schema
 */
export const UpdateBlockNameInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  blockId: z.string().min(1, 'Block ID is required'),
  name: z.string().min(1, 'Block name is required'),
})
export type UpdateBlockNameInput = z.infer<typeof UpdateBlockNameInputSchema>

/**
 * Update block name JSON Schema for MCP registration
 */
export const updateBlockNameJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow containing the block',
    },
    blockId: {
      type: 'string',
      description: 'ID of the block to rename',
    },
    name: {
      type: 'string',
      description: 'New display name for the block',
    },
  },
  required: ['workflowId', 'blockId', 'name'],
}

/**
 * Toggle block enabled input schema
 */
export const ToggleBlockEnabledInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  blockId: z.string().min(1, 'Block ID is required'),
  enabled: z.boolean(),
})
export type ToggleBlockEnabledInput = z.infer<typeof ToggleBlockEnabledInputSchema>

/**
 * Toggle block enabled JSON Schema for MCP registration
 */
export const toggleBlockEnabledJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow containing the block',
    },
    blockId: {
      type: 'string',
      description: 'ID of the block to toggle',
    },
    enabled: {
      type: 'boolean',
      description: 'Whether the block should be enabled',
    },
  },
  required: ['workflowId', 'blockId', 'enabled'],
}

/**
 * Update block parent input schema
 */
export const UpdateBlockParentInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  blockId: z.string().min(1, 'Block ID is required'),
  parentId: z.string().nullable(),
})
export type UpdateBlockParentInput = z.infer<typeof UpdateBlockParentInputSchema>

/**
 * Update block parent JSON Schema for MCP registration
 */
export const updateBlockParentJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow containing the block',
    },
    blockId: {
      type: 'string',
      description: 'ID of the block to update',
    },
    parentId: {
      type: ['string', 'null'],
      description:
        'ID of the parent container (loop/parallel block) to nest inside, or null to remove from parent',
    },
  },
  required: ['workflowId', 'blockId', 'parentId'],
}

/**
 * Update subblock input schema
 */
export const UpdateSubblockInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  blockId: z.string().min(1, 'Block ID is required'),
  subblockId: z.string().min(1, 'Subblock ID is required'),
  value: z.unknown(), // Can be any JSON value
})
export type UpdateSubblockInput = z.infer<typeof UpdateSubblockInputSchema>

/**
 * Update subblock JSON Schema for MCP registration
 */
export const updateSubblockJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow containing the block',
    },
    blockId: {
      type: 'string',
      description: 'ID of the block containing the subblock',
    },
    subblockId: {
      type: 'string',
      description: 'ID of the subblock to update',
    },
    value: {
      description: 'New value for the subblock',
    },
  },
  required: ['workflowId', 'blockId', 'subblockId', 'value'],
}

// ==========================================
// Edge Operation Schemas
// ==========================================

/**
 * Add edge input schema
 */
export const AddEdgeOpInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  source: z.string().min(1, 'Source block ID is required'),
  target: z.string().min(1, 'Target block ID is required'),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  edgeId: z.string().optional(), // Auto-generate if not provided
})
export type AddEdgeOpInput = z.infer<typeof AddEdgeOpInputSchema>

/**
 * Add edge JSON Schema for MCP registration
 */
export const addEdgeOpJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow to add the edge to',
    },
    source: {
      type: 'string',
      description: 'ID of the source block',
    },
    target: {
      type: 'string',
      description: 'ID of the target block',
    },
    sourceHandle: {
      type: 'string',
      description: 'Optional handle name on the source block',
    },
    targetHandle: {
      type: 'string',
      description: 'Optional handle name on the target block',
    },
    edgeId: {
      type: 'string',
      description: 'Optional edge ID (auto-generated if not provided)',
    },
  },
  required: ['workflowId', 'source', 'target'],
}

/**
 * Remove edge input schema
 */
export const RemoveEdgeOpInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  edgeId: z.string().min(1, 'Edge ID is required'),
})
export type RemoveEdgeOpInput = z.infer<typeof RemoveEdgeOpInputSchema>

/**
 * Remove edge JSON Schema for MCP registration
 */
export const removeEdgeOpJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow containing the edge',
    },
    edgeId: {
      type: 'string',
      description: 'ID of the edge to remove',
    },
  },
  required: ['workflowId', 'edgeId'],
}

// ==========================================
// Workflow State Operation Schemas
// ==========================================

/**
 * Replace workflow state input schema
 */
export const ReplaceWorkflowStateInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  state: z.any(), // Full workflow state object
})
export type ReplaceWorkflowStateInput = z.infer<typeof ReplaceWorkflowStateInputSchema>

/**
 * Replace workflow state JSON Schema for MCP registration
 */
export const replaceWorkflowStateJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow to update',
    },
    state: {
      type: 'object',
      description:
        'Complete workflow state to replace with. The current backend contract accepts blocks and edges, supports loops/parallels, and may also include variables plus workflow metadata fields such as lastSaved, isDeployed, and deployedAt.',
    },
  },
  required: ['workflowId', 'state'],
}

// ==========================================
// Variable Operation Schemas
// ==========================================

/**
 * Add variable input schema
 */
export const AddVariableInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  id: z.string().optional(), // Auto-generate if not provided
  name: z.string().min(1, 'Variable name is required'),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'plain']),
  value: z.any(),
})
export type AddVariableInput = z.infer<typeof AddVariableInputSchema>

/**
 * Add variable JSON Schema for MCP registration
 */
export const addVariableJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow to add the variable to',
    },
    id: {
      type: 'string',
      description: 'Optional variable ID (auto-generated if not provided)',
    },
    name: {
      type: 'string',
      description: 'Name of the variable',
    },
    type: {
      type: 'string',
      enum: ['string', 'number', 'boolean', 'object', 'array', 'plain'],
      description: 'Variable type',
    },
    value: {
      description: 'Initial value for the variable',
    },
  },
  required: ['workflowId', 'name', 'type', 'value'],
}

/**
 * Remove variable input schema
 */
export const RemoveVariableInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  variableId: z.string().min(1, 'Variable ID is required'),
})
export type RemoveVariableInput = z.infer<typeof RemoveVariableInputSchema>

/**
 * Remove variable JSON Schema for MCP registration
 */
export const removeVariableJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow containing the variable',
    },
    variableId: {
      type: 'string',
      description: 'ID of the variable to remove',
    },
  },
  required: ['workflowId', 'variableId'],
}

// ==========================================
// Subflow Operation Schemas
// ==========================================

/**
 * Add subflow input schema
 */
export const AddSubflowInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  id: z.string().min(1, 'Subflow ID is required'),
  type: z.enum(['loop', 'parallel']),
  config: z.record(z.any()).optional(),
})
export type AddSubflowInput = z.infer<typeof AddSubflowInputSchema>

/**
 * Add subflow JSON Schema for MCP registration
 */
export const addSubflowJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow to add the subflow to',
    },
    id: {
      type: 'string',
      description: 'Unique ID for the subflow',
    },
    type: {
      type: 'string',
      enum: ['loop', 'parallel'],
      description: 'Type of subflow (loop or parallel)',
    },
    config: {
      type: 'object',
      description: 'Configuration for the subflow',
    },
  },
  required: ['workflowId', 'id', 'type'],
}

/**
 * Update subflow input schema
 */
export const UpdateSubflowInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  id: z.string().min(1, 'Subflow ID is required'),
  type: z.enum(['loop', 'parallel']).optional(),
  config: z.record(z.any()).optional(),
})
export type UpdateSubflowInput = z.infer<typeof UpdateSubflowInputSchema>

/**
 * Update subflow JSON Schema for MCP registration
 */
export const updateSubflowJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow containing the subflow',
    },
    id: {
      type: 'string',
      description: 'ID of the subflow to update',
    },
    type: {
      type: 'string',
      enum: ['loop', 'parallel'],
      description: 'Type of subflow (loop or parallel)',
    },
    config: {
      type: 'object',
      description: 'Updated configuration for the subflow',
    },
  },
  required: ['workflowId', 'id'],
}

/**
 * Remove subflow input schema
 */
export const RemoveSubflowInputSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  id: z.string().min(1, 'Subflow ID is required'),
})
export type RemoveSubflowInput = z.infer<typeof RemoveSubflowInputSchema>

/**
 * Remove subflow JSON Schema for MCP registration
 */
export const removeSubflowJsonSchema = {
  type: 'object',
  properties: {
    workflowId: {
      type: 'string',
      description: 'ID of the workflow containing the subflow',
    },
    id: {
      type: 'string',
      description: 'ID of the subflow to remove',
    },
  },
  required: ['workflowId', 'id'],
}

// ==========================================
// Operation Response Schema
// ==========================================

/**
 * Common operation response schema
 */
export const OperationResponseSchema = z.object({
  success: z.boolean(),
  operationId: z.string(),
  timestamp: z.number(),
  broadcastSent: z.boolean(),
})
export type OperationResponseType = z.infer<typeof OperationResponseSchema>
