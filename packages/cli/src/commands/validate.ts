/**
 * Validate command - validates config file syntax
 */

import { loadConfig } from '../config.js';

interface ValidateOptions {
  config: string;
}

export async function validateCommand(options: ValidateOptions): Promise<void> {
  try {
    await loadConfig(options.config);
    console.log('Config is valid');
    process.exit(0);
  } catch (error) {
    console.error('Config validation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
