/**
 * Update Skill Tool
 *
 * MCP tool for updating an existing skill in a workspace.
 */

import type { SimApiClient } from '../../client/index.js';
import type { Skill } from '../../schemas/skills.js';
import { getLogger } from '../../utils/logger.js';
import { requireParams } from '../../utils/validation.js';

/**
 * Tool name constant
 */
export const UPDATE_SKILL_TOOL_NAME = 'update_skill';

/**
 * Tool description for MCP registration
 */
export const UPDATE_SKILL_DESCRIPTION =
  'Update an existing skill in a workspace. Provide the skill ID and all fields (name, description, content). Name must be kebab-case. Returns the updated skill.';

/**
 * JSON Schema for update skill input (for MCP registration)
 */
export const updateSkillInputSchema = {
  type: 'object',
  properties: {
    workspaceId: {
      type: 'string',
      description: 'Workspace ID containing the skill',
    },
    id: {
      type: 'string',
      description: 'ID of the skill to update',
    },
    name: {
      type: 'string',
      description:
        'New skill name in kebab-case (e.g. "my-skill"). Must be lowercase alphanumeric with hyphens, max 64 characters.',
    },
    description: {
      type: 'string',
      description: 'New description for the skill (max 1024 characters)',
    },
    content: {
      type: 'string',
      description: 'New content/instructions for the skill (max 50000 characters)',
    },
  },
  required: ['workspaceId', 'id', 'name', 'description', 'content'],
};

/**
 * Output type for update skill
 */
export interface UpdateSkillOutput {
  success: boolean;
  skill: Skill;
}

/**
 * Input type for update skill
 */
export interface UpdateSkillInput {
  workspaceId: string;
  id: string;
  name: string;
  description: string;
  content: string;
}

/**
 * Update an existing skill in a workspace
 *
 * @param client - SimApiClient instance
 * @param input - Update skill parameters
 * @returns Updated skill
 */
export async function updateSkill(
  client: SimApiClient,
  input: UpdateSkillInput
): Promise<UpdateSkillOutput> {
  requireParams(
    {
      workspaceId: input.workspaceId,
      id: input.id,
      name: input.name,
      description: input.description,
      content: input.content,
    },
    'update_skill'
  );

  const logger = getLogger();

  try {
    logger.debug('Updating skill', {
      operation: 'update_skill',
      workspaceId: input.workspaceId,
      skillId: input.id,
    });

    const skills = await client.upsertSkills({
      workspaceId: input.workspaceId,
      skills: [
        {
          id: input.id,
          name: input.name,
          description: input.description,
          content: input.content,
        },
      ],
    });

    const updatedSkill = skills[0];

    if (!updatedSkill) {
      throw new Error('Skill update failed: no skill returned from API');
    }

    logger.debug('Skill updated', {
      operation: 'update_skill',
      workspaceId: input.workspaceId,
      skillId: updatedSkill?.id,
    });

    return { success: true, skill: updatedSkill };
  } catch (error) {
    logger.error('Failed to update skill', {
      operation: 'update_skill',
      workspaceId: input.workspaceId,
      skillId: input.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
