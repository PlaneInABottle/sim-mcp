/**
 * Validation Utilities Unit Tests
 *
 * Tests for requireParam and requireParams helpers.
 */

import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../../src/client/errors.js';
import { requireAtLeastOneParam, requireParam, requireParams } from '../../../src/utils/validation.js';

describe('Validation Utilities', () => {
  describe('requireParam', () => {
    it('should pass for a valid non-empty string', () => {
      expect(() => requireParam('valid-value', 'workspaceId', 'list_skills')).not.toThrow();
    });

    it('should throw ValidationError for undefined', () => {
      expect(() => requireParam(undefined, 'workspaceId', 'list_skills')).toThrow(ValidationError);
      expect(() => requireParam(undefined, 'workspaceId', 'list_skills')).toThrow(
        "Missing required parameter 'workspaceId' for list_skills"
      );
    });

    it('should throw ValidationError for null', () => {
      expect(() => requireParam(null, 'workspaceId', 'list_skills')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty string', () => {
      expect(() => requireParam('', 'workspaceId', 'list_skills')).toThrow(ValidationError);
    });

    it('should throw ValidationError for whitespace-only string', () => {
      expect(() => requireParam('   ', 'workspaceId', 'list_skills')).toThrow(ValidationError);
    });

    it('should include parameter name in error details', () => {
      try {
        requireParam(undefined, 'workspaceId', 'list_skills');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toEqual({
          parameter: 'workspaceId',
          tool: 'list_skills',
        });
      }
    });

    it('should include tool name in error message', () => {
      expect(() => requireParam(undefined, 'id', 'get_skill')).toThrow(
        "Missing required parameter 'id' for get_skill"
      );
    });
  });

  describe('requireParams', () => {
    it('should pass when all parameters are valid', () => {
      expect(() =>
        requireParams(
          { workspaceId: 'ws-123', name: 'my-skill', description: 'desc', content: 'body' },
          'create_skill'
        )
      ).not.toThrow();
    });

    it('should throw ValidationError for a single missing parameter', () => {
      expect(() =>
        requireParams(
          { workspaceId: 'ws-123', id: undefined },
          'get_skill'
        )
      ).toThrow(ValidationError);
      expect(() =>
        requireParams(
          { workspaceId: 'ws-123', id: undefined },
          'get_skill'
        )
      ).toThrow("Missing required parameter 'id' for get_skill");
    });

    it('should throw ValidationError listing all missing parameters', () => {
      expect(() =>
        requireParams(
          { workspaceId: '', name: undefined, description: 'desc', content: null },
          'create_skill'
        )
      ).toThrow(ValidationError);
      expect(() =>
        requireParams(
          { workspaceId: '', name: undefined, description: 'desc', content: null },
          'create_skill'
        )
      ).toThrow("Missing required parameters 'workspaceId', 'name', 'content' for create_skill");
    });

    it('should include parameters array in error details when multiple missing', () => {
      try {
        requireParams(
          { workspaceId: undefined, id: '' },
          'delete_skill'
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toEqual({
          parameters: ['workspaceId', 'id'],
          tool: 'delete_skill',
        });
      }
    });

    it('should include single parameter in error details when one missing', () => {
      try {
        requireParams(
          { workspaceId: undefined },
          'list_skills'
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toEqual({
          parameter: 'workspaceId',
          tool: 'list_skills',
        });
      }
    });

    it('should treat whitespace-only strings as missing', () => {
      expect(() =>
        requireParams({ workspaceId: '   ' }, 'list_skills')
      ).toThrow(ValidationError);
    });
  });

  describe('requireAtLeastOneParam', () => {
    it('should pass when one parameter is present', () => {
      expect(() =>
        requireAtLeastOneParam({ workspaceId: 'ws-123', workflowId: undefined }, 'list_custom_tools')
      ).not.toThrow();
    });

    it('should throw ValidationError when all parameters are missing', () => {
      expect(() =>
        requireAtLeastOneParam({ workspaceId: '', workflowId: undefined }, 'list_custom_tools')
      ).toThrow(ValidationError);
      expect(() =>
        requireAtLeastOneParam({ workspaceId: '', workflowId: undefined }, 'list_custom_tools')
      ).toThrow("One of 'workspaceId', 'workflowId' is required for list_custom_tools");
    });
  });
});
