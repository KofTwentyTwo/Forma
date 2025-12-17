#!/usr/bin/env node
/**
 * Forma CLI - Publish Markdown to Confluence
 */

import { Command } from 'commander';
import { publishCommand } from './commands/publish.js';
import { lintCommand } from './commands/lint.js';
import { planCommand } from './commands/plan.js';
import { validateCommand } from './commands/validate.js';
import { renderCommand } from './commands/render.js';

const program = new Command();

program
  .name('forma')
  .description('Publish Markdown documentation to Confluence')
  .version('0.0.1');

program
  .command('publish', { isDefault: true })
  .description('Publish Markdown to Confluence')
  .option('-c, --config <path>', 'Config file path', '.confluence-publish.yml')
  .option('-d, --dry-run', 'Show what would change without publishing')
  .option('-m, --mapping <name>', 'Publish only specific mapping')
  .option('--log-level <level>', 'Log level (debug|info|warn|error)', 'info')
  .action(publishCommand);

program
  .command('lint')
  .description('Validate locally before publishing (no API calls)')
  .option('-c, --config <path>', 'Config file path', '.confluence-publish.yml')
  .action(lintCommand);

program
  .command('plan')
  .description('Show what would change (dry-run)')
  .option('-c, --config <path>', 'Config file path', '.confluence-publish.yml')
  .option('-m, --mapping <name>', 'Plan only specific mapping')
  .action(planCommand);

program
  .command('validate')
  .description('Validate config file syntax')
  .option('-c, --config <path>', 'Config file path', '.confluence-publish.yml')
  .action(validateCommand);

program
  .command('render')
  .description('Convert Markdown to Confluence storage format (no publish)')
  .option('-c, --config <path>', 'Config file path', '.confluence-publish.yml')
  .option('-o, --output <dir>', 'Output directory for rendered files')
  .action(renderCommand);

program.parse();
