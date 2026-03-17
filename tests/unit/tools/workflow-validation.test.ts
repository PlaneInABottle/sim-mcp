import { describe, expect, it } from 'vitest';

import { validateWorkflowDefinition } from '../../../src/tools/workflow/validation.js';
import {
  mockWorkflowValidationBadBlocks,
  mockWorkflowValidationBadEdges,
  mockWorkflowValidationBrokenEdges,
  mockWorkflowValidationDisabledPath,
  mockWorkflowValidationIsolatedEnabledBlock,
  mockWorkflowValidationLoopTraversal,
  mockWorkflowValidationMalformedEntries,
  mockWorkflowValidationNoState,
  mockWorkflowValidationParallelTraversal,
  mockWorkflowValidationUnknownType,
  mockWorkflowValidationUnreachableBranch,
  mockWorkflowValidationUnusedVariable,
  mockWorkflowValidationVariablePartialMatch,
  mockWorkflowValidationVariableTokenMatch,
  mockWorkflowValidationWorkflow,
} from '../../mocks/sim-api.js';

describe('validateWorkflowDefinition', () => {
  it('returns no findings for a valid phase-1 workflow', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationWorkflow);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.summary).toMatchObject({
      enabledBlocks: 2,
      enabledRoots: 1,
      enabledReachableBlocks: 2,
      edgesChecked: 1,
      errors: 0,
      warnings: 0,
    });
  });

  it('reports workflow_state_missing when state is absent', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationNoState);

    expect(result.valid).toBe(false);
    expect(result.errors.map((finding) => finding.code)).toContain('workflow_state_missing');
  });

  it('reports workflow_blocks_invalid when blocks is not an object', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationBadBlocks);

    expect(result.errors.map((finding) => finding.code)).toContain('workflow_blocks_invalid');
  });

  it('reports workflow_edges_invalid when edges is not an array', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationBadEdges);

    expect(result.errors.map((finding) => finding.code)).toContain('workflow_edges_invalid');
  });

  it('reports malformed block and edge entries', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationMalformedEntries);

    expect(result.errors.map((finding) => finding.code)).toContain('workflow_block_malformed');
    expect(result.errors.map((finding) => finding.code)).toContain('workflow_edge_malformed');
  });

  it('reports unknown block types even when disabled', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationUnknownType);

    expect(result.errors.map((finding) => finding.code)).toContain('unknown_block_type');
  });

  it('reports broken edge sources and targets independently', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationBrokenEdges);

    expect(result.errors.map((finding) => finding.code)).toContain('broken_edge_source');
    expect(result.errors.map((finding) => finding.code)).toContain('broken_edge_target');
  });

  it('reports isolated enabled non-root blocks as unconnected', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationIsolatedEnabledBlock);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unconnected_enabled_block',
          blockId: 'block-3',
        }),
      ])
    );
  });

  it('ignores disabled blocks for connectivity and keeps disabled-only paths unreachable', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationDisabledPath);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unreachable_enabled_block',
          blockId: 'block-3',
        }),
      ])
    );
    expect(result.errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ blockId: 'block-2' }),
        expect.objectContaining({ blockId: 'block-4' }),
      ])
    );
  });

  it('reports enabled subgraphs with edges but no root path as unreachable', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationUnreachableBranch);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unreachable_enabled_block',
          blockId: 'block-3',
        }),
        expect.objectContaining({
          code: 'unreachable_enabled_block',
          blockId: 'block-4',
        }),
      ])
    );
  });

  it('treats loop containers as structural traversal nodes', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationLoopTraversal);

    expect(result.errors).toEqual([]);
    expect(result.summary).toMatchObject({
      enabledBlocks: 2,
      enabledRoots: 1,
      enabledReachableBlocks: 2,
    });
  });

  it('treats parallel containers as structural traversal nodes', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationParallelTraversal);

    expect(result.errors).toEqual([]);
    expect(result.summary).toMatchObject({
      enabledBlocks: 2,
      enabledRoots: 1,
      enabledReachableBlocks: 2,
    });
  });

  it('reports unused variables as warnings', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationUnusedVariable);

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unused_variable',
          variableName: 'count',
        }),
      ])
    );
  });

  it('does not warn when exact variable token is present', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationVariableTokenMatch);

    expect(result.warnings).toEqual([]);
  });

  it('does not treat partial token matches as usage', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationVariablePartialMatch);

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unused_variable',
          variableName: 'count',
        }),
      ])
    );
  });
});
