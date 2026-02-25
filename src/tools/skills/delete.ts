/**
 * Delete Skill Tool
 *
 * MCP tool for deleting a skill from a workspace.
 */

import type { SimApiClient } from '../../client/index.js';
import { getLogger } from '../../utils/logger.js';
import { requireParams } from '../../utils/validation.js';

/**
 * Tool name constant
 */
export const DELETE_SKILL_TOOL_NAME = 'delete_skill';

/**
 * Tool description for MCP registration
 */
export const DELETE_SKILL_DESCRIPTION =
  'Delete a skill from a workspace by its ID. This permanently removes the skill. Requires both the skill ID and workspace ID.';

/**
 * JSON Schema for delete skill input (for MCP registration)
 */
export const deleteSkillInputSchema = {
  type: 'object',
  properties: {
    workspaceId: {
      type: 'string',
      description: 'Workspace ID containing the skill',
    },
    id: {
      type: 'string',
      description: 'ID of the skill to delete',
    },
  },
  required: ['workspaceId', 'id'],
};

/**
 * Output type for delete skill
 */
export interface DeleteSkillOutput {
  success: boolean;
}

/**
 * Input type for delete skill
 */
export interface DeleteSkillInput {
  workspaceId: string;
  id: string;
}

/**
 * Delete a skill from a workspace
 *
 * @param client - SimApiClient instance
 * @param input - Delete skill parameters
 * @returns Success confirmation
 */
export async function deleteSkill(
  client: SimApiClient,
  input: DeleteSkillInput
): Promise<DeleteSkillOutput> {
  requireParams(
    { workspaceId: input.workspaceId, id: input.id },
    'delete_skill'
  );

  const logger = getLogger();

  try {
    logger.debug('Deleting skill', {
      operation: 'delete_skill',
      workspaceId: input.workspaceId,
      skillId: input.id,
    });

    await client.deleteSkill({
      id: input.id,
      workspaceId: input.workspaceId,
    });

    logger.debug('Skill deleted', {
      operation: 'delete_skill',
      workspaceId: input.workspaceId,
      skillId: input.id,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete skill', {
      operation: 'delete_skill',
      workspaceId: input.workspaceId,
      skillId: input.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
