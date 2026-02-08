/**
 * Block Tools Module
 *
 * Exports all block-related MCP tools.
 */

// Get block tool (query)
export {
  GET_BLOCK_DESCRIPTION,
  GET_BLOCK_TOOL_NAME,
  getBlock,
  getBlockInputSchema,
} from './get-block.js';
export type { GetBlockInput, GetBlockOutput } from './get-block.js';

// Add blocks tool (batch)
export {
  ADD_BLOCKS_DESCRIPTION,
  ADD_BLOCKS_TOOL_NAME,
  addBlocks,
  addBlocksInputSchema,
} from './add-blocks.js';
export type { AddBlocksInput, AddBlocksOutput } from './add-blocks.js';

// Remove blocks tool (batch)
export {
  REMOVE_BLOCKS_DESCRIPTION,
  REMOVE_BLOCKS_TOOL_NAME,
  removeBlocks,
  removeBlocksInputSchema,
} from './remove-blocks.js';
export type { RemoveBlocksInput, RemoveBlocksOutput } from './remove-blocks.js';

// Update block name tool
export {
  UPDATE_BLOCK_NAME_DESCRIPTION,
  UPDATE_BLOCK_NAME_TOOL_NAME,
  updateBlockName,
  updateBlockNameInputSchema,
} from './update-name.js';
export type { UpdateBlockNameInput, UpdateBlockNameOutput } from './update-name.js';

// Toggle block enabled tool
export {
  TOGGLE_BLOCK_ENABLED_DESCRIPTION,
  TOGGLE_BLOCK_ENABLED_TOOL_NAME,
  toggleBlockEnabled,
  toggleBlockEnabledInputSchema,
} from './toggle-enabled.js';
export type { ToggleBlockEnabledInput, ToggleBlockEnabledOutput } from './toggle-enabled.js';

// Update block parent tool
export {
  UPDATE_BLOCK_PARENT_DESCRIPTION,
  UPDATE_BLOCK_PARENT_TOOL_NAME,
  updateBlockParent,
  updateBlockParentInputSchema,
} from './update-parent.js';
export type { UpdateBlockParentInput, UpdateBlockParentOutput } from './update-parent.js';

// Update subblock tool
export {
  UPDATE_SUBBLOCK_DESCRIPTION,
  UPDATE_SUBBLOCK_TOOL_NAME,
  updateSubblock,
  updateSubblockInputSchema,
} from './update-subblock.js';
export type { UpdateSubblockInput, UpdateSubblockOutput } from './update-subblock.js';
