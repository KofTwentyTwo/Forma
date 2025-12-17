/**
 * Lint command - validates locally before publishing
 */

import { loadConfig } from '../config.js';
import { Linter } from '@forma/publisher';

interface LintOptions {
  config: string;
}

export async function lintCommand(options: LintOptions): Promise<void> {
  const config = await loadConfig(options.config);
  const linter = new Linter(config);

  // TODO: Run lint and output results
  const result = await linter.lint();

  if (!result.valid) {
    for (const error of result.errors) {
      console.error(`ERROR [${error.code}] ${error.file}${error.line ? `:${error.line}` : ''}: ${error.message}`);
    }
    process.exit(1);
  }

  for (const warning of result.warnings) {
    console.warn(`WARN [${warning.code}] ${warning.file}${warning.line ? `:${warning.line}` : ''}: ${warning.message}`);
  }

  console.log('Lint passed');
  process.exit(0);
}
