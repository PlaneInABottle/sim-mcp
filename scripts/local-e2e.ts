import fs from 'node:fs';
import path from 'node:path';

import { createSimApiClient } from '../src/client/index.ts';
import {
  addBlocks,
  removeBlocks,
  toggleBlockEnabled,
  updateBlockName,
  updateSubblock,
} from '../src/tools/blocks/index.ts';
import { addEdgeOp, removeEdgeOp } from '../src/tools/edges/index.ts';
import { updateSubflow } from '../src/tools/subflows/index.ts';
import { addVariable, removeVariable } from '../src/tools/variables/index.ts';

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

function safe(obj: unknown): unknown {
  if (typeof obj === 'string' && obj.startsWith('sk-')) return '[REDACTED]';
  return obj;
}

async function main() {
  loadEnvLocal();

  const baseUrl = process.env.SIM_API_BASE_URL || 'http://localhost:3000';
  const apiKey = process.env.SIM_API_KEY;
  if (!apiKey) {
    throw new Error('Missing SIM_API_KEY');
  }

  const client = createSimApiClient({ baseUrl, apiKey });
  const tempWorkflowId = process.env.TEST_WORKFLOW_ID;
  if (!tempWorkflowId) throw new Error('Missing TEST_WORKFLOW_ID');

  console.log(`Testing operations on workflow: ${tempWorkflowId}`);

  const newBlockId = `e2e-block-${Date.now()}`;
  const secondBlockId = `e2e-block-2-${Date.now()}`;

  const added = await addBlocks(client, {
    workflowId: tempWorkflowId,
    blocks: [
      { id: newBlockId, type: 'agent', name: 'E2E Agent', position: { x: 100, y: 100 } },
      { id: secondBlockId, type: 'agent', name: 'E2E Agent 2', position: { x: 300, y: 100 } },
    ],
  });
  console.log(`addBlocks: ok (op=${added.operationId})`);

  const newBlock = { id: newBlockId, name: 'E2E Agent' };

  await updateBlockName(client, {
    workflowId: tempWorkflowId,
    blockId: newBlock.id,
    name: 'E2E Agent Renamed',
  });
  console.log('updateBlockName: ok');

  await toggleBlockEnabled(client, {
    workflowId: tempWorkflowId,
    blockId: newBlock.id,
    enabled: false,
  });
  console.log('toggleBlockEnabled: ok');

  await updateSubblock(client, {
    workflowId: tempWorkflowId,
    blockId: newBlock.id,
    subblockId: 'messages',
    value: [{ role: 'user', content: 'test message' }],
  });
  console.log('updateSubblock: ok');

  const edgeId = `e2e-edge-${Date.now()}`;
  await addEdgeOp(client, {
    workflowId: tempWorkflowId,
    source: newBlockId,
    target: secondBlockId,
    edgeId,
  });
  console.log('addEdgeOp: ok');

  await removeEdgeOp(client, { workflowId: tempWorkflowId, edgeId });
  console.log('removeEdgeOp: ok');

  const varId = `e2e-var-${Date.now()}`;
  await addVariable(client, {
    workflowId: tempWorkflowId,
    id: varId,
    name: 'E2E Var',
    type: 'string',
    value: 'hello',
  });
  console.log('addVariable: ok');

  await removeVariable(client, { workflowId: tempWorkflowId, variableId: varId });
  console.log('removeVariable: ok');

  const loopBlockId = `e2e-loop-${Date.now()}`;
  await addBlocks(client, {
    workflowId: tempWorkflowId,
    blocks: [{ id: loopBlockId, type: 'loop', name: 'E2E Loop', position: { x: 200, y: 200 } }],
  });
  console.log('addBlocks (loop): ok');

  await updateSubflow(client, {
    workflowId: tempWorkflowId,
    id: loopBlockId,
    type: 'loop',
    config: { iterations: 10 },
  });
  console.log('updateSubflow: ok');

  await removeBlocks(client, { workflowId: tempWorkflowId, blockIds: [loopBlockId] });
  console.log('removeBlocks (loop): ok');

  await removeBlocks(client, {
    workflowId: tempWorkflowId,
    blockIds: [newBlock.id, secondBlockId],
  });
  console.log('removeBlocks: ok');

  console.log('\n✅ All operations tests passed!');
}

main().catch((err) => {
  console.error('E2E failed:', safe(err instanceof Error ? err.message : err));
  process.exit(1);
});
