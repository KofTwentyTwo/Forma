/**
 * Render command - converts Markdown to Confluence storage format
 */

import { loadConfig } from '../config.js';

interface RenderOptions {
  config: string;
  output?: string;
}

export async function renderCommand(options: RenderOptions): Promise<void> {
  const config = await loadConfig(options.config);
  // TODO: Implement render
  console.log('Rendering with config:', options.config);
  process.exit(0);
}
