import type { WorkflowValidationWorkflow } from '../../client/index.js';

import { BlockTypeEnum } from '../../schemas/block.js';

export type ValidationFindingCode =
  | 'workflow_state_missing'
  | 'workflow_blocks_invalid'
  | 'workflow_block_malformed'
  | 'workflow_edges_invalid'
  | 'workflow_edge_malformed'
  | 'edge_source_handle_malformed'
  | 'edge_target_handle_malformed'
  | 'block_outputs_declaration_malformed'
  | 'block_inputs_declaration_malformed'
  | 'unknown_block_type'
  | 'broken_edge_source'
  | 'broken_edge_target'
  | 'broken_edge_source_handle'
  | 'broken_edge_target_handle'
  | 'unconnected_enabled_block'
  | 'unreachable_enabled_block'
  | 'unused_variable';

export interface ValidationFinding {
  code: ValidationFindingCode;
  severity: 'error' | 'warning';
  scope: 'workflow' | 'block' | 'edge' | 'variable';
  message: string;
  blockId?: string;
  edgeId?: string;
  variableId?: string;
  variableName?: string;
  sourceId?: string;
  targetId?: string;
}

export interface WorkflowValidationSummary {
  enabledBlocks: number;
  enabledRoots: number;
  enabledReachableBlocks: number;
  edgesChecked: number;
  errors: number;
  warnings: number;
}

export interface WorkflowValidationResult {
  workflowId: string;
  valid: boolean;
  summary: WorkflowValidationSummary;
  errors: ValidationFinding[];
  warnings: ValidationFinding[];
}

type RawEdge = {
  id?: unknown;
  source?: unknown;
  target?: unknown;
  sourceHandle?: unknown;
  targetHandle?: unknown;
};

type ValidBlockRecord = Record<string, Record<string, unknown>>;

type ValidEdgeRecord = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: unknown;
  targetHandle?: unknown;
};

type HandleDeclarationInspection =
  | { status: 'absent' }
  | { status: 'malformed' }
  | { status: 'valid'; handles: Set<string> };

const VALID_BLOCK_TYPES = new Set<string>(BlockTypeEnum.options);
const ROOT_BLOCK_TYPES = new Set<string>([
  'api_trigger',
  'webhook',
  'schedule',
  'manual_trigger',
  'chat_trigger',
  'input_trigger',
  'start_trigger',
  'generic_webhook',
]);
const IMPLICIT_SOURCE_HANDLES = new Set<string>(['source', 'error']);
const IMPLICIT_TARGET_HANDLES = new Set<string>(['target']);
const DYNAMIC_SOURCE_HANDLE_PREFIXES = ['condition-', 'router-', 'switch-'];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
  return isObjectRecord(value) ? value : null;
}

function toNodeMap(value: unknown): Record<string, unknown> {
  return isObjectRecord(value) ? value : {};
}

function isEnabledBlock(block: Record<string, unknown>): boolean {
  return block.enabled !== false;
}

function createFinding(finding: ValidationFinding): ValidationFinding {
  return finding;
}

function isValidHandleField(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isImplicitSourceHandle(handle: string): boolean {
  return (
    IMPLICIT_SOURCE_HANDLES.has(handle) ||
    DYNAMIC_SOURCE_HANDLE_PREFIXES.some((prefix) => handle.startsWith(prefix))
  );
}

function isImplicitTargetHandle(handle: string): boolean {
  return IMPLICIT_TARGET_HANDLES.has(handle);
}

function inspectHandleIdsArray(value: unknown): HandleDeclarationInspection {
  if (!Array.isArray(value)) {
    return { status: 'malformed' };
  }

  const handleIds = new Set<string>();

  for (const entry of value) {
    if (!isObjectRecord(entry) || typeof entry.id !== 'string') {
      return { status: 'malformed' };
    }

    handleIds.add(entry.id);
  }

  return { status: 'valid', handles: handleIds };
}

function inspectDeclaredSourceHandles(block: Record<string, unknown>): HandleDeclarationInspection {
  if (!Object.prototype.hasOwnProperty.call(block, 'outputs')) {
    return { status: 'absent' };
  }

  if (Array.isArray(block.outputs)) {
    return inspectHandleIdsArray(block.outputs);
  }

  if (isObjectRecord(block.outputs)) {
    return { status: 'valid', handles: new Set(Object.keys(block.outputs)) };
  }

  return { status: 'malformed' };
}

function inspectDeclaredTargetHandles(block: Record<string, unknown>): HandleDeclarationInspection {
  if (!Object.prototype.hasOwnProperty.call(block, 'inputs')) {
    return { status: 'absent' };
  }

  return inspectHandleIdsArray(block.inputs);
}

function buildResult(
  workflowId: string,
  errors: ValidationFinding[],
  warnings: ValidationFinding[],
  summary: Omit<WorkflowValidationSummary, 'errors' | 'warnings'>
): WorkflowValidationResult {
  return {
    workflowId,
    valid: errors.length === 0,
    summary: {
      ...summary,
      errors: errors.length,
      warnings: warnings.length,
    },
    errors,
    warnings,
  };
}

function collectValidBlocks(
  rawBlocks: Record<string, unknown>,
  errors: ValidationFinding[]
): ValidBlockRecord {
  const validBlocks: ValidBlockRecord = {};

  for (const [blockId, blockValue] of Object.entries(rawBlocks)) {
    if (!isObjectRecord(blockValue)) {
      errors.push(
        createFinding({
          code: 'workflow_block_malformed',
          severity: 'error',
          scope: 'block',
          message: `Block '${blockId}' is missing or not an object.`,
          blockId,
        })
      );
      continue;
    }

    validBlocks[blockId] = blockValue;
    const blockType = blockValue.type;

    if (typeof blockType !== 'string' || !VALID_BLOCK_TYPES.has(blockType)) {
      errors.push(
        createFinding({
          code: 'unknown_block_type',
          severity: 'error',
          scope: 'block',
          message: `Block '${blockId}' has an unknown block type.`,
          blockId,
        })
      );
    }
  }

  return validBlocks;
}

function collectValidEdges(
  rawEdges: unknown,
  errors: ValidationFinding[]
): { validEdges: ValidEdgeRecord[]; edgesChecked: number; edgesTraversable: boolean } {
  if (rawEdges === undefined) {
    return { validEdges: [], edgesChecked: 0, edgesTraversable: true };
  }

  if (!Array.isArray(rawEdges)) {
    errors.push(
      createFinding({
        code: 'workflow_edges_invalid',
        severity: 'error',
        scope: 'workflow',
        message: 'Workflow state.edges exists but is not an array.',
      })
    );

    return { validEdges: [], edgesChecked: 0, edgesTraversable: false };
  }

  const validEdges: ValidEdgeRecord[] = [];

  for (const edgeValue of rawEdges as RawEdge[]) {
    if (!isObjectRecord(edgeValue)) {
      errors.push(
        createFinding({
          code: 'workflow_edge_malformed',
          severity: 'error',
          scope: 'edge',
          message: 'An edge entry is missing or not an object.',
        })
      );
      continue;
    }

    const edgeId = typeof edgeValue.id === 'string' ? edgeValue.id : undefined;
    if (typeof edgeValue.source !== 'string' || typeof edgeValue.target !== 'string') {
      errors.push(
        createFinding({
          code: 'workflow_edge_malformed',
          severity: 'error',
          scope: 'edge',
          message: `Edge '${edgeId ?? 'unknown'}' is missing a valid source or target.`,
          ...(edgeId ? { edgeId } : {}),
        })
      );
      continue;
    }

    if ('sourceHandle' in edgeValue && !isValidHandleField(edgeValue.sourceHandle)) {
      errors.push(
        createFinding({
          code: 'edge_source_handle_malformed',
          severity: 'error',
          scope: 'edge',
          message: `Edge '${edgeId ?? `${edgeValue.source}->${edgeValue.target}`}' has an invalid sourceHandle value.`,
          edgeId: edgeId ?? `${edgeValue.source}->${edgeValue.target}`,
          sourceId: edgeValue.source,
          targetId: edgeValue.target,
        })
      );
    }

    if ('targetHandle' in edgeValue && !isValidHandleField(edgeValue.targetHandle)) {
      errors.push(
        createFinding({
          code: 'edge_target_handle_malformed',
          severity: 'error',
          scope: 'edge',
          message: `Edge '${edgeId ?? `${edgeValue.source}->${edgeValue.target}`}' has an invalid targetHandle value.`,
          edgeId: edgeId ?? `${edgeValue.source}->${edgeValue.target}`,
          sourceId: edgeValue.source,
          targetId: edgeValue.target,
        })
      );
    }

    validEdges.push({
      id: edgeId ?? `${edgeValue.source}->${edgeValue.target}`,
      source: edgeValue.source,
      target: edgeValue.target,
      ...(Object.prototype.hasOwnProperty.call(edgeValue, 'sourceHandle')
        ? { sourceHandle: edgeValue.sourceHandle }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(edgeValue, 'targetHandle')
        ? { targetHandle: edgeValue.targetHandle }
        : {}),
    });
  }

  return {
    validEdges,
    edgesChecked: validEdges.length,
    edgesTraversable: true,
  };
}

function collectBrokenEdgeFindings(
  edges: ValidEdgeRecord[],
  nodeIds: Set<string>,
  errors: ValidationFinding[]
): void {
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(
        createFinding({
          code: 'broken_edge_source',
          severity: 'error',
          scope: 'edge',
          message: `Edge '${edge.id}' references an unknown source block.`,
          edgeId: edge.id,
          sourceId: edge.source,
        })
      );
    }

    if (!nodeIds.has(edge.target)) {
      errors.push(
        createFinding({
          code: 'broken_edge_target',
          severity: 'error',
          scope: 'edge',
          message: `Edge '${edge.id}' references an unknown target block.`,
          edgeId: edge.id,
          targetId: edge.target,
        })
      );
    }
  }
}

function collectBrokenHandleFindings(
  edges: ValidEdgeRecord[],
  validBlocks: ValidBlockRecord,
  structuralNodeIds: Set<string>,
  errors: ValidationFinding[]
): void {
  const reportedMalformedDeclarations = new Set<string>();

  for (const edge of edges) {
    const sourceBlock = validBlocks[edge.source];
    if (
      sourceBlock &&
      !structuralNodeIds.has(edge.source) &&
      typeof edge.sourceHandle === 'string' &&
      !isImplicitSourceHandle(edge.sourceHandle)
    ) {
      const declaredSourceHandles = inspectDeclaredSourceHandles(sourceBlock);
      if (declaredSourceHandles.status === 'malformed') {
        const malformedKey = `${edge.source}:outputs`;
        if (!reportedMalformedDeclarations.has(malformedKey)) {
          reportedMalformedDeclarations.add(malformedKey);
          errors.push(
            createFinding({
              code: 'block_outputs_declaration_malformed',
              severity: 'error',
              scope: 'block',
              message: `Block '${edge.source}' has an invalid outputs declaration; expected an object record or an array of objects with string id values for source-handle validation.`,
              blockId: edge.source,
            })
          );
        }
      }

      if (
        declaredSourceHandles.status === 'valid' &&
        !declaredSourceHandles.handles.has(edge.sourceHandle)
      ) {
        errors.push(
          createFinding({
            code: 'broken_edge_source_handle',
            severity: 'error',
            scope: 'edge',
            message: `Edge '${edge.id}' references an unknown source handle on block '${edge.source}'.`,
            edgeId: edge.id,
            sourceId: edge.source,
            targetId: edge.target,
          })
        );
      }
    }

    const targetBlock = validBlocks[edge.target];
    if (
      targetBlock &&
      !structuralNodeIds.has(edge.target) &&
      typeof edge.targetHandle === 'string' &&
      !isImplicitTargetHandle(edge.targetHandle)
    ) {
      const declaredTargetHandles = inspectDeclaredTargetHandles(targetBlock);
      if (declaredTargetHandles.status === 'malformed') {
        const malformedKey = `${edge.target}:inputs`;
        if (!reportedMalformedDeclarations.has(malformedKey)) {
          reportedMalformedDeclarations.add(malformedKey);
          errors.push(
            createFinding({
              code: 'block_inputs_declaration_malformed',
              severity: 'error',
              scope: 'block',
              message: `Block '${edge.target}' has an invalid inputs declaration; expected an array of objects with string id values for target-handle validation.`,
              blockId: edge.target,
            })
          );
        }
      }

      if (
        declaredTargetHandles.status === 'valid' &&
        !declaredTargetHandles.handles.has(edge.targetHandle)
      ) {
        errors.push(
          createFinding({
            code: 'broken_edge_target_handle',
            severity: 'error',
            scope: 'edge',
            message: `Edge '${edge.id}' references an unknown target handle on block '${edge.target}'.`,
            edgeId: edge.id,
            sourceId: edge.source,
            targetId: edge.target,
          })
        );
      }
    }
  }
}

function collectEnabledGraph(
  validBlocks: ValidBlockRecord,
  structuralNodeIds: Set<string>,
  edges: ValidEdgeRecord[]
): {
  adjacency: Map<string, Set<string>>;
  incidentCounts: Map<string, number>;
  rawIncidentCounts: Map<string, number>;
  enabledRoots: string[];
} {
  const adjacency = new Map<string, Set<string>>();
  const incidentCounts = new Map<string, number>();
  const rawIncidentCounts = new Map<string, number>();

  for (const nodeId of structuralNodeIds) {
    adjacency.set(nodeId, new Set<string>());
  }

  for (const [blockId, block] of Object.entries(validBlocks)) {
    rawIncidentCounts.set(blockId, 0);

    if (!isEnabledBlock(block)) {
      continue;
    }

    adjacency.set(blockId, new Set<string>());
    incidentCounts.set(blockId, 0);
  }

  for (const edge of edges) {
    const sourceBlock = validBlocks[edge.source];
    const targetBlock = validBlocks[edge.target];
    const sourceIsStructural = structuralNodeIds.has(edge.source);
    const targetIsStructural = structuralNodeIds.has(edge.target);

    if (sourceBlock) {
      rawIncidentCounts.set(edge.source, (rawIncidentCounts.get(edge.source) ?? 0) + 1);
    }

    if (targetBlock) {
      rawIncidentCounts.set(edge.target, (rawIncidentCounts.get(edge.target) ?? 0) + 1);
    }

    if (
      (sourceBlock && !isEnabledBlock(sourceBlock)) ||
      (targetBlock && !isEnabledBlock(targetBlock))
    ) {
      continue;
    }

    if (
      adjacency.has(edge.source) &&
      adjacency.has(edge.target) &&
      (sourceBlock || sourceIsStructural) &&
      (targetBlock || targetIsStructural)
    ) {
      adjacency.get(edge.source)?.add(edge.target);
      if (sourceBlock) {
        incidentCounts.set(edge.source, (incidentCounts.get(edge.source) ?? 0) + 1);
      }
      if (targetBlock) {
        incidentCounts.set(edge.target, (incidentCounts.get(edge.target) ?? 0) + 1);
      }
    }
  }

  const enabledRoots = Object.entries(validBlocks)
    .filter(
      ([blockId, block]) =>
        adjacency.has(blockId) && typeof block.type === 'string' && ROOT_BLOCK_TYPES.has(block.type)
    )
    .map(([blockId]) => blockId);

  return { adjacency, incidentCounts, rawIncidentCounts, enabledRoots };
}

function collectReachableBlocks(adjacency: Map<string, Set<string>>, roots: string[]): Set<string> {
  const visited = new Set<string>();
  const queue = [...roots];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return visited;
}

function collectConnectivityFindings(
  validBlocks: ValidBlockRecord,
  graph: {
    adjacency: Map<string, Set<string>>;
    incidentCounts: Map<string, number>;
    rawIncidentCounts: Map<string, number>;
    enabledRoots: string[];
  },
  reachableBlocks: Set<string>,
  errors: ValidationFinding[]
): void {
  const rootSet = new Set(graph.enabledRoots);

  for (const [blockId, block] of Object.entries(validBlocks)) {
    if (!isEnabledBlock(block) || rootSet.has(blockId) || !graph.adjacency.has(blockId)) {
      continue;
    }

    const incidentCount = graph.incidentCounts.get(blockId) ?? 0;
    const rawIncidentCount = graph.rawIncidentCounts.get(blockId) ?? 0;

    if (incidentCount === 0 && rawIncidentCount === 0) {
      errors.push(
        createFinding({
          code: 'unconnected_enabled_block',
          severity: 'error',
          scope: 'block',
          message: `Enabled block '${blockId}' has no incident enabled edges.`,
          blockId,
        })
      );
      continue;
    }

    if (!reachableBlocks.has(blockId)) {
      errors.push(
        createFinding({
          code: 'unreachable_enabled_block',
          severity: 'error',
          scope: 'block',
          message: `Enabled block '${blockId}' is unreachable from any enabled trigger root.`,
          blockId,
        })
      );
    }
  }
}

function countReachableEnabledBlocks(
  validBlocks: ValidBlockRecord,
  reachableBlocks: Set<string>
): number {
  let reachableEnabledBlocks = 0;

  for (const [blockId, block] of Object.entries(validBlocks)) {
    if (isEnabledBlock(block) && reachableBlocks.has(blockId)) {
      reachableEnabledBlocks += 1;
    }
  }

  return reachableEnabledBlocks;
}

function serializeWorkflowForVariableUsage(rawState: Record<string, unknown>): string {
  const { variables: _variables, ...stateWithoutVariables } = rawState;
  return JSON.stringify(stateWithoutVariables);
}

function collectUnusedVariableWarnings(
  rawState: Record<string, unknown>,
  warnings: ValidationFinding[]
): void {
  if (!Array.isArray(rawState.variables)) {
    return;
  }

  const serializedState = serializeWorkflowForVariableUsage(rawState);

  for (const variable of rawState.variables as Array<Record<string, unknown>>) {
    if (!isObjectRecord(variable)) {
      continue;
    }

    const variableId = typeof variable.id === 'string' ? variable.id : undefined;
    const variableName = typeof variable.name === 'string' ? variable.name : undefined;
    if (!variableName) {
      continue;
    }

    const token = `{{${variableName}}}`;
    if (!serializedState.includes(token)) {
      warnings.push(
        createFinding({
          code: 'unused_variable',
          severity: 'warning',
          scope: 'variable',
          message: `Variable '${variableName}' is not referenced in workflow content.`,
          ...(variableId ? { variableId } : {}),
          variableName,
        })
      );
    }
  }
}

export function validateWorkflowDefinition(
  workflow: WorkflowValidationWorkflow
): WorkflowValidationResult {
  const errors: ValidationFinding[] = [];
  const warnings: ValidationFinding[] = [];
  const rawState = toObjectRecord(workflow.state);

  if (!rawState) {
    errors.push(
      createFinding({
        code: 'workflow_state_missing',
        severity: 'error',
        scope: 'workflow',
        message: 'Workflow state is missing or not an object.',
      })
    );

    return buildResult(workflow.id, errors, warnings, {
      enabledBlocks: 0,
      enabledRoots: 0,
      enabledReachableBlocks: 0,
      edgesChecked: 0,
    });
  }

  const rawBlocks = toObjectRecord(rawState.blocks);
  if (!rawBlocks) {
    errors.push(
      createFinding({
        code: 'workflow_blocks_invalid',
        severity: 'error',
        scope: 'workflow',
        message: 'Workflow state.blocks is missing or not an object.',
      })
    );

    return buildResult(workflow.id, errors, warnings, {
      enabledBlocks: 0,
      enabledRoots: 0,
      enabledReachableBlocks: 0,
      edgesChecked: 0,
    });
  }

  const validBlocks = collectValidBlocks(rawBlocks, errors);
  const edgeResult = collectValidEdges(rawState.edges, errors);
  const structuralNodeIds = new Set<string>([
    ...Object.keys(toNodeMap(rawState.loops)),
    ...Object.keys(toNodeMap(rawState.parallels)),
  ]);
  const nodeIds = new Set<string>([...Object.keys(validBlocks), ...structuralNodeIds]);

  if (edgeResult.edgesTraversable) {
    collectBrokenEdgeFindings(edgeResult.validEdges, nodeIds, errors);
    collectBrokenHandleFindings(edgeResult.validEdges, validBlocks, structuralNodeIds, errors);
  }

  const enabledGraph = collectEnabledGraph(validBlocks, structuralNodeIds, edgeResult.validEdges);
  const reachableBlocks = collectReachableBlocks(enabledGraph.adjacency, enabledGraph.enabledRoots);
  collectConnectivityFindings(validBlocks, enabledGraph, reachableBlocks, errors);
  collectUnusedVariableWarnings(rawState, warnings);

  return buildResult(workflow.id, errors, warnings, {
    enabledBlocks: Object.values(validBlocks).filter(isEnabledBlock).length,
    enabledRoots: enabledGraph.enabledRoots.length,
    enabledReachableBlocks: countReachableEnabledBlocks(validBlocks, reachableBlocks),
    edgesChecked: edgeResult.edgesChecked,
  });
}
