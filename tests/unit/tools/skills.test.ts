/**
 * Skills Tools Unit Tests
 *
 * Tests for all skills tools including input validation,
 * lightweight metadata stripping, and payload reduction.
 */

import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../../src/client/errors.js';
import {
  createSkill,
  deleteSkill,
  getSkill,
  listSkills,
  stripSkillDetails,
  updateSkill,
} from '../../../src/tools/skills/index.js';
import {
  createMockSimApiClient,
  mockSkill,
  mockSkillWithLongContent,
} from '../../mocks/sim-api.js';

// Mock the logger to avoid output during tests
vi.mock('../../../src/utils/logger.js', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('Skills Tools', () => {
  describe('stripSkillDetails', () => {
    it('should extract only id, name, description', () => {
      const result = stripSkillDetails(mockSkill);
      expect(result).toEqual({
        id: 'skill-1',
        name: 'my-skill',
        description: 'A test skill',
      });
    });

    it('should not include content field', () => {
      const result = stripSkillDetails(mockSkill);
      expect(result).not.toHaveProperty('content');
    });

    it('should not include workspaceId field', () => {
      const result = stripSkillDetails(mockSkill);
      expect(result).not.toHaveProperty('workspaceId');
    });

    it('should not include userId field', () => {
      const result = stripSkillDetails(mockSkill);
      expect(result).not.toHaveProperty('userId');
    });

    it('should not include createdAt field', () => {
      const result = stripSkillDetails(mockSkill);
      expect(result).not.toHaveProperty('createdAt');
    });

    it('should not include updatedAt field', () => {
      const result = stripSkillDetails(mockSkill);
      expect(result).not.toHaveProperty('updatedAt');
    });

    it('should significantly reduce payload size for large content', () => {
      const fullJson = JSON.stringify(mockSkillWithLongContent);
      const strippedJson = JSON.stringify(stripSkillDetails(mockSkillWithLongContent));
      // The 50KB content should be stripped, making output much smaller
      expect(strippedJson.length).toBeLessThan(fullJson.length * 0.01);
    });
  });

  describe('listSkills', () => {
    it('should return lightweight skill metadata', async () => {
      const mockClient = createMockSimApiClient();
      const result = await listSkills(mockClient, { workspaceId: 'ws-789' });

      expect(result.skills).toHaveLength(2);
      expect(result.skills[0]).toEqual({
        id: 'skill-1',
        name: 'my-skill',
        description: 'A test skill',
      });
      expect(result.skills[1]).toEqual({
        id: 'skill-2',
        name: 'detailed-skill',
        description: 'A skill with extensive content',
      });
    });

    it('should strip content from all skills', async () => {
      const mockClient = createMockSimApiClient();
      const result = await listSkills(mockClient, { workspaceId: 'ws-789' });

      for (const skill of result.skills) {
        expect(skill).not.toHaveProperty('content');
        expect(skill).not.toHaveProperty('workspaceId');
        expect(skill).not.toHaveProperty('userId');
        expect(skill).not.toHaveProperty('createdAt');
        expect(skill).not.toHaveProperty('updatedAt');
      }
    });

    it('should pass workspaceId to client', async () => {
      const mockClient = createMockSimApiClient();
      await listSkills(mockClient, { workspaceId: 'ws-789' });

      expect(mockClient.listSkills).toHaveBeenCalledWith({ workspaceId: 'ws-789' });
    });

    it('should handle empty results', async () => {
      const mockClient = createMockSimApiClient({
        listSkills: async (params) => [],
      });
      const result = await listSkills(mockClient, { workspaceId: 'ws-empty' });

      expect(result.skills).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        listSkills: async () => {
          throw new Error('API error');
        },
      });

      await expect(
        listSkills(mockClient, { workspaceId: 'ws-789' })
      ).rejects.toThrow('API error');
    });
  });

  describe('getSkill', () => {
    it('should return full skill details when found', async () => {
      const mockClient = createMockSimApiClient();
      const result = await getSkill(mockClient, {
        workspaceId: 'ws-789',
        id: 'skill-1',
      });

      expect(result.skill).toBeDefined();
      expect(result.skill.id).toBe('skill-1');
      expect(result.skill.name).toBe('my-skill');
      expect(result.skill.description).toBe('A test skill');
      expect(result.skill.content).toBe('Test content for the skill');
    });

    it('should include content in the result (full details)', async () => {
      const mockClient = createMockSimApiClient();
      const result = await getSkill(mockClient, {
        workspaceId: 'ws-789',
        id: 'skill-2',
      });

      expect(result.skill.content).toBeDefined();
      expect(result.skill.content.length).toBe(50000);
    });

    it('should include all fields (timestamps, workspace, user)', async () => {
      const mockClient = createMockSimApiClient();
      const result = await getSkill(mockClient, {
        workspaceId: 'ws-789',
        id: 'skill-1',
      });

      expect(result.skill).toHaveProperty('workspaceId');
      expect(result.skill).toHaveProperty('userId');
      expect(result.skill).toHaveProperty('createdAt');
      expect(result.skill).toHaveProperty('updatedAt');
    });

    it('should pass workspaceId to client', async () => {
      const mockClient = createMockSimApiClient();
      await getSkill(mockClient, {
        workspaceId: 'ws-789',
        id: 'skill-1',
      });

      expect(mockClient.listSkills).toHaveBeenCalledWith({ workspaceId: 'ws-789' });
    });

    it('should throw error when skill not found', async () => {
      const mockClient = createMockSimApiClient();
      await expect(
        getSkill(mockClient, {
          workspaceId: 'ws-789',
          id: 'non-existent',
        })
      ).rejects.toThrow(
        "Skill with ID 'non-existent' not found in workspace 'ws-789'"
      );
    });

    it('should throw error when workspace has no skills', async () => {
      const mockClient = createMockSimApiClient({
        listSkills: async () => [],
      });
      await expect(
        getSkill(mockClient, {
          workspaceId: 'ws-empty',
          id: 'skill-1',
        })
      ).rejects.toThrow(
        "Skill with ID 'skill-1' not found in workspace 'ws-empty'"
      );
    });

    it('should propagate API errors', async () => {
      const mockClient = createMockSimApiClient({
        listSkills: async () => {
          throw new Error('Network error');
        },
      });

      await expect(
        getSkill(mockClient, { workspaceId: 'ws-789', id: 'skill-1' })
      ).rejects.toThrow('Network error');
    });
  });

  describe('payload size reduction', () => {
    it('list_skills should produce significantly smaller output than raw API response', async () => {
      const mockClient = createMockSimApiClient();

      // Get raw API response (what client returns)
      const rawSkills = await mockClient.listSkills({ workspaceId: 'ws-789' });
      const rawPayload = JSON.stringify(rawSkills);

      // Get stripped list_skills output
      const listResult = await listSkills(mockClient, { workspaceId: 'ws-789' });
      const listPayload = JSON.stringify(listResult.skills);

      // The stripped output should be dramatically smaller
      // Raw has 50KB+ content field, stripped should be under 200 bytes
      expect(listPayload.length).toBeLessThan(rawPayload.length * 0.01);
    });

    it('get_skill should return full content for targeted retrieval', async () => {
      const mockClient = createMockSimApiClient();
      const result = await getSkill(mockClient, {
        workspaceId: 'ws-789',
        id: 'skill-2',
      });

      // The full content should be preserved
      const getPayload = JSON.stringify(result.skill);
      expect(getPayload.length).toBeGreaterThan(50000);
    });
  });

  describe('input validation', () => {
    const mockClient = createMockSimApiClient();

    describe('listSkills', () => {
      it('should throw ValidationError when workspaceId is missing', async () => {
        await expect(
          listSkills(mockClient, { workspaceId: '' })
        ).rejects.toThrow(ValidationError);
        await expect(
          listSkills(mockClient, { workspaceId: '' })
        ).rejects.toThrow("Missing required parameter 'workspaceId' for list_skills");
      });

      it('should not call API when validation fails', async () => {
        const client = createMockSimApiClient();
        try {
          await listSkills(client, { workspaceId: '' });
        } catch {
          // expected
        }
        expect(client.listSkills).not.toHaveBeenCalled();
      });
    });

    describe('getSkill', () => {
      it('should throw ValidationError when workspaceId is missing', async () => {
        await expect(
          getSkill(mockClient, { workspaceId: '', id: 'skill-1' })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when id is missing', async () => {
        await expect(
          getSkill(mockClient, { workspaceId: 'ws-789', id: '' })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError listing both params when both missing', async () => {
        await expect(
          getSkill(mockClient, { workspaceId: '', id: '' })
        ).rejects.toThrow("Missing required parameters 'workspaceId', 'id' for get_skill");
      });
    });

    describe('createSkill', () => {
      it('should throw ValidationError when workspaceId is missing', async () => {
        await expect(
          createSkill(mockClient, {
            workspaceId: '',
            name: 'my-skill',
            description: 'desc',
            content: 'body',
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when multiple params are missing', async () => {
        await expect(
          createSkill(mockClient, {
            workspaceId: '',
            name: '',
            description: 'desc',
            content: '',
          })
        ).rejects.toThrow("Missing required parameters 'workspaceId', 'name', 'content' for create_skill");
      });
    });

    describe('updateSkill', () => {
      it('should throw ValidationError when id is missing', async () => {
        await expect(
          updateSkill(mockClient, {
            workspaceId: 'ws-789',
            id: '',
            name: 'my-skill',
            description: 'desc',
            content: 'body',
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when multiple params are missing', async () => {
        await expect(
          updateSkill(mockClient, {
            workspaceId: '',
            id: '',
            name: 'my-skill',
            description: 'desc',
            content: 'body',
          })
        ).rejects.toThrow("Missing required parameters 'workspaceId', 'id' for update_skill");
      });
    });

    describe('deleteSkill', () => {
      it('should throw ValidationError when workspaceId is missing', async () => {
        await expect(
          deleteSkill(mockClient, { workspaceId: '', id: 'skill-1' })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when id is missing', async () => {
        await expect(
          deleteSkill(mockClient, { workspaceId: 'ws-789', id: '' })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError listing both params when both missing', async () => {
        await expect(
          deleteSkill(mockClient, { workspaceId: '', id: '' })
        ).rejects.toThrow("Missing required parameters 'workspaceId', 'id' for delete_skill");
      });
    });
  });
});
