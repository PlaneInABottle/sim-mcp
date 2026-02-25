/**
 * Create Skill Tool
 *
 * MCP tool for creating a new skill in a workspace.
 */

import type { SimApiClient } from '../../client/index.js';
import type { Skill } from '../../schemas/skills.js';
import { getLogger } from '../../utils/logger.js';
import { requireParams } from '../../utils/validation.js';

/**
 * Tool name constant
 */
export const CREATE_SKILL_TOOL_NAME = 'create_skill';

/**
 * Tool description for MCP registration
 */
export const CREATE_SKILL_DESCRIPTION =
  'Create a new skill in a workspace. Skills are reusable knowledge or instructions that can be attached to agent blocks. Name must be kebab-case (e.g. "my-skill"). Returns the created skill.';

/**
 * JSON Schema for create skill input (for MCP registration)
 */
export const createSkillInputSchema = {
  type: 'object',
  properties: {
    workspaceId: {
      type: 'string',
      description: 'Workspace ID to create the skill in',
    },
    name: {
      type: 'string',
      description:
        'Skill name in kebab-case (e.g. "my-skill"). Must be lowercase alphanumeric with hyphens, max 64 characters.',
    },
    description: {
      type: 'string',
      description: 'Short description of the skill (max 1024 characters)',
    },
    content: {
      type: 'string',
      description: 'The skill content/instructions (max 50000 characters)',
    },
  },
  required: ['workspaceId', 'name', 'description', 'content'],
};

/**
 * Output type for create skill
 */
export interface CreateSkillOutput {
  success: boolean;
  skill: Skill;
}

/**
 * Input type for create skill
 */
export interface CreateSkillInput {
  workspaceId: string;
  name: string;
  description: string;
  content: string;
}

/**
 * Create a new skill in a workspace
 *
 * @param client - SimApiClient instance
 * @param input - Create skill parameters
 * @returns Created skill
 */
export async function createSkill(
  client: SimApiClient,
  input: CreateSkillInput
): Promise<CreateSkillOutput> {
  requireParams(
    {
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      content: input.content,
    },
    'create_skill'
  );

  const logger = getLogger();

  try {
    logger.debug('Creating skill', {
      operation: 'create_skill',
      workspaceId: input.workspaceId,
      name: input.name,
    });

    const skills = await client.upsertSkills({
      workspaceId: input.workspaceId,
      skills: [
        {
          name: input.name,
          description: input.description,
          content: input.content,
        },
      ],
    });

    const createdSkill = skills[0];

    if (!createdSkill) {
      throw new Error('Skill creation failed: no skill returned from API');
    }

    logger.debug('Skill created', {
      operation: 'create_skill',
      workspaceId: input.workspaceId,
      skillId: createdSkill?.id,
    });

    return { success: true, skill: createdSkill };
  } catch (error) {
    logger.error('Failed to create skill', {
      operation: 'create_skill',
      workspaceId: input.workspaceId,
      name: input.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
