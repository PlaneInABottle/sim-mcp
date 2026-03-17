import { describe, expect, it } from 'vitest';

import { validateWorkflowDefinition } from '../../../src/tools/workflow/validation.js';
import {
  mockWorkflowValidationBadBlocks,
  mockWorkflowValidationBadEdges,
  mockWorkflowValidationBrokenEdges,
  mockWorkflowValidationBrokenEndpointWithHandle,
  mockWorkflowValidationBrokenSourceHandle,
  mockWorkflowValidationBrokenTargetHandle,
  mockWorkflowValidationDeclarationAbsentHandle,
  mockWorkflowValidationDisabledPath,
  mockWorkflowValidationIsolatedEnabledBlock,
  mockWorkflowValidationLoopHandleSkip,
  mockWorkflowValidationLoopTraversal,
  mockWorkflowValidationMalformedEntries,
  mockWorkflowValidationMalformedSourceHandle,
  mockWorkflowValidationMalformedTargetHandle,
  mockWorkflowValidationNoState,
  mockWorkflowValidationNullHandles,
  mockWorkflowValidationOmittedHandles,
  mockWorkflowValidationParallelTraversal,
  mockWorkflowValidationUnknownType,
  mockWorkflowValidationUnreachableBranch,
  mockWorkflowValidationUnusedVariable,
  mockWorkflowValidationValidSourceHandleArray,
  mockWorkflowValidationValidSourceHandleRecord,
  mockWorkflowValidationValidTargetHandleArray,
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

  it('keeps omitted and null handles valid', () => {
    const omittedResult = validateWorkflowDefinition(mockWorkflowValidationOmittedHandles);
    const nullResult = validateWorkflowDefinition(mockWorkflowValidationNullHandles);

    expect(omittedResult.errors.map((finding) => finding.code)).not.toEqual(
      expect.arrayContaining([
        'edge_source_handle_malformed',
        'edge_target_handle_malformed',
        'broken_edge_source_handle',
        'broken_edge_target_handle',
      ])
    );
    expect(nullResult.errors.map((finding) => finding.code)).not.toEqual(
      expect.arrayContaining([
        'edge_source_handle_malformed',
        'edge_target_handle_malformed',
        'broken_edge_source_handle',
        'broken_edge_target_handle',
      ])
    );
  });

  it('reports malformed explicit handle field values', () => {
    const sourceResult = validateWorkflowDefinition(mockWorkflowValidationMalformedSourceHandle);
    const targetResult = validateWorkflowDefinition(mockWorkflowValidationMalformedTargetHandle);

    expect(sourceResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'edge_source_handle_malformed',
          edgeId: 'edge-1',
          sourceId: 'block-1',
          targetId: 'block-2',
        }),
      ])
    );
    expect(targetResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'edge_target_handle_malformed',
          edgeId: 'edge-1',
          sourceId: 'block-1',
          targetId: 'block-2',
        }),
      ])
    );
  });

  it('accepts explicit handles when locally declared', () => {
    const sourceArrayResult = validateWorkflowDefinition(
      mockWorkflowValidationValidSourceHandleArray
    );
    const sourceRecordResult = validateWorkflowDefinition(
      mockWorkflowValidationValidSourceHandleRecord
    );
    const targetArrayResult = validateWorkflowDefinition(
      mockWorkflowValidationValidTargetHandleArray
    );

    expect(sourceArrayResult.errors.map((finding) => finding.code)).not.toContain(
      'broken_edge_source_handle'
    );
    expect(sourceRecordResult.errors.map((finding) => finding.code)).not.toContain(
      'broken_edge_source_handle'
    );
    expect(targetArrayResult.errors.map((finding) => finding.code)).not.toContain(
      'broken_edge_target_handle'
    );
  });

  it('reports broken explicit handles only when declarations are locally supported', () => {
    const brokenSourceResult = validateWorkflowDefinition(mockWorkflowValidationBrokenSourceHandle);
    const brokenTargetResult = validateWorkflowDefinition(mockWorkflowValidationBrokenTargetHandle);
    const declarationAbsentResult = validateWorkflowDefinition(
      mockWorkflowValidationDeclarationAbsentHandle
    );
    const loopSkipResult = validateWorkflowDefinition(mockWorkflowValidationLoopHandleSkip);

    expect(brokenSourceResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'broken_edge_source_handle',
          edgeId: 'edge-1',
          sourceId: 'block-1',
          targetId: 'block-2',
        }),
      ])
    );
    expect(brokenTargetResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'broken_edge_target_handle',
          edgeId: 'edge-1',
          sourceId: 'block-1',
          targetId: 'block-2',
        }),
      ])
    );
    expect(declarationAbsentResult.errors.map((finding) => finding.code)).not.toEqual(
      expect.arrayContaining(['broken_edge_source_handle', 'broken_edge_target_handle'])
    );
    expect(loopSkipResult.errors.map((finding) => finding.code)).not.toEqual(
      expect.arrayContaining(['broken_edge_source_handle', 'broken_edge_target_handle'])
    );
  });

  it('keeps missing endpoint findings as the only errors for missing explicit-handle endpoints', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationBrokenEndpointWithHandle);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'broken_edge_source',
          edgeId: 'edge-1',
          sourceId: 'missing-source',
        }),
      ])
    );
    expect(result.errors.map((finding) => finding.code)).not.toContain('broken_edge_source_handle');
    expect(result.errors.map((finding) => finding.code)).not.toContain('broken_edge_target_handle');
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
