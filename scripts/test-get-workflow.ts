import fs from 'node:fs';
import path from 'node:path';

import { createSimApiClient } from '../src/client/index.ts';

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

async function main(): Promise<void> {
  loadEnvLocal();

  const baseUrl = process.env.SIM_API_BASE_URL || 'http://localhost:3000';
  const apiKey = process.env.SIM_API_KEY;
  const workflowId = process.env.TEST_WORKFLOW_ID;

  if (!apiKey) {
    throw new Error('Missing SIM_API_KEY');
  }

  if (!workflowId) {
    throw new Error('Missing TEST_WORKFLOW_ID');
  }

  const client = createSimApiClient({ baseUrl, apiKey });
  const workflow = await client.getWorkflow(workflowId);

  console.log('getWorkflow response:\n', JSON.stringify(workflow, null, 2));

  const blocks = Array.isArray(workflow?.blocks) ? workflow.blocks : [];
  const hasConfig = blocks.some(
    (block) => !!block && typeof block === 'object' && 'config' in block
  );
  const hasSubBlocks = blocks.some(
    (block) => !!block && typeof block === 'object' && 'subBlocks' in block
  );

  console.log(`blocks count: ${blocks.length}`);
  console.log(`blocks have config field: ${hasConfig}`);
  console.log(`blocks have subBlocks field: ${hasSubBlocks}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Test failed:', message);
  process.exit(1);
});
