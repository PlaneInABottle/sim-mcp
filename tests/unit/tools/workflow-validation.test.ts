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
  mockWorkflowValidationDuplicateMalformedInputsDeclaration,
  mockWorkflowValidationDuplicateMalformedOutputsDeclaration,
  mockWorkflowValidationImplicitHandles,
  mockWorkflowValidationIsolatedEnabledBlock,
  mockWorkflowValidationLoopHandleSkip,
  mockWorkflowValidationLoopTraversal,
  mockWorkflowValidationMalformedConditionRows,
  mockWorkflowValidationMalformedEntries,
  mockWorkflowValidationMalformedInputsArrayDeclaration,
  mockWorkflowValidationMalformedInputsContainerDeclaration,
  mockWorkflowValidationMalformedOutputsArrayDeclaration,
  mockWorkflowValidationMalformedOutputsContainerDeclaration,
  mockWorkflowValidationMalformedSourceHandle,
  mockWorkflowValidationMalformedTargetHandle,
  mockWorkflowValidationNoState,
  mockWorkflowValidationNullHandles,
  mockWorkflowValidationOmittedHandles,
  mockWorkflowValidationParallelTraversal,
  mockWorkflowValidationStaleConditionRowHandle,
  mockWorkflowValidationUnknownType,
  mockWorkflowValidationUnreachableBranch,
  mockWorkflowValidationUnusedVariable,
  mockWorkflowValidationValidConditionRowHandles,
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

  it('reports malformed outputs declarations as block-scoped errors and suppresses source broken-handle findings', () => {
    const malformedArrayResult = validateWorkflowDefinition(
      mockWorkflowValidationMalformedOutputsArrayDeclaration
    );
    const malformedContainerResult = validateWorkflowDefinition(
      mockWorkflowValidationMalformedOutputsContainerDeclaration
    );

    expect(malformedArrayResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'block_outputs_declaration_malformed',
          severity: 'error',
          scope: 'block',
          blockId: 'block-1',
          message:
            "Block 'block-1' has an invalid outputs declaration; expected an object record or an array of objects with string id values for source-handle validation.",
        }),
      ])
    );
    expect(malformedContainerResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'block_outputs_declaration_malformed',
          severity: 'error',
          scope: 'block',
          blockId: 'block-1',
          message:
            "Block 'block-1' has an invalid outputs declaration; expected an object record or an array of objects with string id values for source-handle validation.",
        }),
      ])
    );
    expect(malformedArrayResult.errors.map((finding) => finding.code)).not.toContain(
      'broken_edge_source_handle'
    );
    expect(malformedContainerResult.errors.map((finding) => finding.code)).not.toContain(
      'broken_edge_source_handle'
    );
  });

  it('reports malformed inputs declarations as block-scoped errors and suppresses target broken-handle findings', () => {
    const malformedArrayResult = validateWorkflowDefinition(
      mockWorkflowValidationMalformedInputsArrayDeclaration
    );
    const malformedContainerResult = validateWorkflowDefinition(
      mockWorkflowValidationMalformedInputsContainerDeclaration
    );

    expect(malformedArrayResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'block_inputs_declaration_malformed',
          severity: 'error',
          scope: 'block',
          blockId: 'block-2',
          message:
            "Block 'block-2' has an invalid inputs declaration; expected an array of objects with string id values for target-handle validation.",
        }),
      ])
    );
    expect(malformedContainerResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'block_inputs_declaration_malformed',
          severity: 'error',
          scope: 'block',
          blockId: 'block-2',
          message:
            "Block 'block-2' has an invalid inputs declaration; expected an array of objects with string id values for target-handle validation.",
        }),
      ])
    );
    expect(malformedArrayResult.errors.map((finding) => finding.code)).not.toContain(
      'broken_edge_target_handle'
    );
    expect(malformedContainerResult.errors.map((finding) => finding.code)).not.toContain(
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

  it('deduplicates malformed declaration findings once per block field per run', () => {
    const sourceResult = validateWorkflowDefinition(
      mockWorkflowValidationDuplicateMalformedOutputsDeclaration
    );
    const targetResult = validateWorkflowDefinition(
      mockWorkflowValidationDuplicateMalformedInputsDeclaration
    );

    expect(
      sourceResult.errors.filter(
        (finding) =>
          finding.code === 'block_outputs_declaration_malformed' && finding.blockId === 'block-1'
      )
    ).toHaveLength(1);
    expect(
      targetResult.errors.filter(
        (finding) =>
          finding.code === 'block_inputs_declaration_malformed' && finding.blockId === 'block-2'
      )
    ).toHaveLength(1);
    expect(sourceResult.errors.map((finding) => finding.code)).not.toContain(
      'broken_edge_source_handle'
    );
    expect(targetResult.errors.map((finding) => finding.code)).not.toContain(
      'broken_edge_target_handle'
    );
  });

  it('ignores implicit source and target handles', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationImplicitHandles);

    expect(result.errors.map((finding) => finding.code)).not.toContain('broken_edge_source_handle');
    expect(result.errors.map((finding) => finding.code)).not.toContain('broken_edge_target_handle');
  });

  it('accepts exact condition row-id handles when current condition rows prove them', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationValidConditionRowHandles);

    expect(result.errors.map((finding) => finding.code)).not.toContain(
      'stale_condition_source_handle'
    );
  });

  it('reports stale condition source handles when current condition rows disprove them', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationStaleConditionRowHandle);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'stale_condition_source_handle',
          edgeId: 'edge-1',
          sourceId: 'block-1',
          targetId: 'block-2',
        }),
      ])
    );
  });

  it('skips stale condition-handle findings when condition row data is malformed', () => {
    const result = validateWorkflowDefinition(mockWorkflowValidationMalformedConditionRows);

    expect(result.errors.map((finding) => finding.code)).not.toContain(
      'stale_condition_source_handle'
    );
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
