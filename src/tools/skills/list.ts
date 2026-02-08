/**
 * List Skills Tool
 *
 * MCP tool for listing skills in a workspace.
 */

import type { SimApiClient } from '../../client/index.js';
import type { Skill } from '../../schemas/skills.js';
import { getLogger } from '../../utils/logger.js';

/**
 * Tool name constant
 */
export const LIST_SKILLS_TOOL_NAME = 'list_skills';

/**
 * Tool description for MCP registration
 */
export const LIST_SKILLS_DESCRIPTION =
  'List all skills in a workspace. Returns skills with their id, name, description, and content. Requires workspaceId parameter.';

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
  skills: Skill[];
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

    return { skills };
  } catch (error) {
    logger.error('Failed to list skills', {
      operation: 'list_skills',
      workspaceId: input.workspaceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
