/**
 * List Skills Tool
 *
 * MCP tool for listing skills in a workspace.
 */

import type { SimApiClient } from '../../client/index.js';
import type { Skill, SkillMetadata } from '../../schemas/skills.js';
import { getLogger } from '../../utils/logger.js';
import { requireParam } from '../../utils/validation.js';

/**
 * Strip full skill to lightweight metadata.
 * Removes content, timestamps, and internal IDs to reduce response size.
 */
export function stripSkillDetails(skill: Skill): SkillMetadata {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
  };
}

/**
 * Tool name constant
 */
export const LIST_SKILLS_TOOL_NAME = 'list_skills';

/**
 * Tool description for MCP registration
 */
export const LIST_SKILLS_DESCRIPTION =
  'List all skills in a workspace. Returns lightweight skill metadata (id, name, description) without content. Use get_skill to retrieve full skill details including content. Requires workspaceId parameter.';

/**
 * JSON Schema for list skills input (for MCP registration)
 */
export const listSkillsInputSchema = {
  type: 'object',
  properties: {
    workspaceId: {
      type: 'string',
      description: 'Workspace ID to list skills from (required)',
    },
  },
  required: ['workspaceId'],
};

/**
 * Output type for list skills
 */
export interface ListSkillsOutput {
  skills: SkillMetadata[];
}

/**
 * Input type for list skills
 */
export interface ListSkillsInput {
  workspaceId: string;
}

/**
 * List skills for a workspace
 *
 * @param client - SimApiClient instance
 * @param input - List skills parameters
 * @returns List of skills
 */
export async function listSkills(
  client: SimApiClient,
  input: ListSkillsInput
): Promise<ListSkillsOutput> {
  requireParam(input.workspaceId, 'workspaceId', 'list_skills');

  const logger = getLogger();

  try {
    logger.debug('Listing skills', {
      operation: 'list_skills',
      workspaceId: input.workspaceId,
    });

    const skills = await client.listSkills({ workspaceId: input.workspaceId });

    logger.debug('Skills retrieved', {
      operation: 'list_skills',
      count: skills.length,
    });

    return { skills: skills.map(stripSkillDetails) };
  } catch (error) {
    logger.error('Failed to list skills', {
      operation: 'list_skills',
      workspaceId: input.workspaceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
