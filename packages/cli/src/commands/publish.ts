/**
 * Publish command - publishes Markdown to Confluence
 */

import { loadConfig } from '../config.js';

interface PublishOptions {
  config: string;
  dryRun?: boolean;
  mapping?: string;
  logLevel: string;
}

export async function publishCommand(options: PublishOptions): Promise<void> {
  await loadConfig(options.config);
  // TODO: Implement publish
  console.log('Publishing with config:', options.config);
  process.exit(0);
}
