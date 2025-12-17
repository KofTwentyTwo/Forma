/**
 * Local linting - validates before publish
 */

import type { Config, LintResult } from '../types.js';

export class Linter {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  // TODO: Implement lint checks
  // - Config syntax and schema validation
  // - Local directories exist
  // - Duplicate titles within same parent
  // - Broken relative links
  // - Missing attachments
  // - Cross-mapping links (warn)
  // - Title length (255 char limit)
  // - Forbidden characters in titles
  // - Markdown syntax errors

  async lint(): Promise<LintResult> {
    throw new Error('Not implemented');
  }
}
