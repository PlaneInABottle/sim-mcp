/**
 * Skills Module
 *
 * Exports all skills-related MCP tools.
 */

// List skills tool
export {
  LIST_SKILLS_DESCRIPTION,
  LIST_SKILLS_TOOL_NAME,
  listSkills,
  listSkillsInputSchema,
} from './list.js';
export type { ListSkillsInput, ListSkillsOutput } from './list.js';

// Create skill tool
export {
  CREATE_SKILL_DESCRIPTION,
  CREATE_SKILL_TOOL_NAME,
  createSkill,
  createSkillInputSchema,
} from './create.js';
export type { CreateSkillInput, CreateSkillOutput } from './create.js';

// Update skill tool
export {
  UPDATE_SKILL_DESCRIPTION,
  UPDATE_SKILL_TOOL_NAME,
  updateSkill,
  updateSkillInputSchema,
} from './update.js';
export type { UpdateSkillInput, UpdateSkillOutput } from './update.js';

// Delete skill tool
export {
  DELETE_SKILL_DESCRIPTION,
  DELETE_SKILL_TOOL_NAME,
  deleteSkill,
  deleteSkillInputSchema,
} from './delete.js';
export type { DeleteSkillInput, DeleteSkillOutput } from './delete.js';
