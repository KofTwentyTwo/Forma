/**
 * Plan command - dry-run to show what would change
 */

import { loadConfig } from '../config.js';

interface PlanOptions {
  config: string;
  mapping?: string;
}

export async function planCommand(options: PlanOptions): Promise<void> {
  const config = await loadConfig(options.config);
  // TODO: Implement plan (dry-run)
  console.log('Planning with config:', options.config);
  process.exit(0);
}
