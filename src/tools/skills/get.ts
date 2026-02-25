/**
 * Get Skill Tool
 *
 * MCP tool for retrieving a single skill by ID from a workspace.
 * Returns full skill details including content.
 */

import type { SimApiClient } from '../../client/index.js';
import type { Skill } from '../../schemas/skills.js';
import { getLogger } from '../../utils/logger.js';
import { requireParams } from '../../utils/validation.js';

/**
 * Tool name constant
 */
export const GET_SKILL_TOOL_NAME = 'get_skill';

/**
 * Tool description for MCP registration
 */
export const GET_SKILL_DESCRIPTION =
  'Get full details of a specific skill by ID, including its content. Use list_skills first to ' +
  'discover skill IDs and metadata, then use this tool to retrieve the full content of a specific skill.';

/**
 * JSON Schema for get skill input (for MCP registration)
 */
export const getSkillInputSchema = {
  type: 'object',
  properties: {
    workspaceId: {
      type: 'string',
      description: 'Workspace ID containing the skill',
    },
    id: {
      type: 'string',
      description: 'ID of the skill to retrieve',
    },
  },
  required: ['workspaceId', 'id'],
};

/**
 * Input type for get skill
 */
export interface GetSkillInput {
  workspaceId: string;
  id: string;
}

/**
 * Output type for get skill
 */
export interface GetSkillOutput {
  skill: Skill;
}

/**
 * Get a single skill by ID from a workspace
 *
 * @param client - SimApiClient instance
 * @param input - Workspace ID and skill ID
 * @returns Full skill details including content
 * @throws Error if skill is not found
 */
export async function getSkill(
  client: SimApiClient,
  input: GetSkillInput
): Promise<GetSkillOutput> {
  requireParams(
    { workspaceId: input.workspaceId, id: input.id },
    'get_skill'
  );

  const logger = getLogger();

  try {
    logger.debug('Getting skill from workspace', {
      operation: 'get_skill',
      workspaceId: input.workspaceId,
      skillId: input.id,
    });

    // List all skills and find the one by ID
    const skills = await client.listSkills({ workspaceId: input.workspaceId });
    const skill = skills.find((s) => s.id === input.id);

    if (!skill) {
      throw new Error(
        `Skill with ID '${input.id}' not found in workspace '${input.workspaceId}'`
      );
    }

    logger.debug('Skill retrieved successfully', {
      operation: 'get_skill',
      workspaceId: input.workspaceId,
      skillId: input.id,
      skillName: skill.name,
    });

    return { skill };
  } catch (error) {
    logger.error('Failed to get skill', {
      operation: 'get_skill',
      workspaceId: input.workspaceId,
      skillId: input.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
