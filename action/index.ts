/**
 * GitHub Action entrypoint
 */

import * as core from '@actions/core';
import { Publisher } from '@forma/publisher';
import { loadConfig } from './config.js';

async function run(): Promise<void> {
  try {
    const configPath = core.getInput('config') || '.confluence-publish.yml';
    const dryRun = core.getInput('dry_run') === 'true';
    const mapping = core.getInput('mapping') || undefined;

    const config = await loadConfig(configPath);
    if (dryRun) {
      config.publish.dryRun = true;
    }

    const publisher = new Publisher(config);
    const result = await publisher.publish();

    core.setOutput('pages_created', result.created.length);
    core.setOutput('pages_updated', result.updated.length);
    core.setOutput('pages_unchanged', result.unchanged.length);

    // Write job summary
    await core.summary
      .addHeading('Forma Publish Results')
      .addTable([
        [{ data: 'Status', header: true }, { data: 'Count', header: true }],
        ['Created', result.created.length.toString()],
        ['Updated', result.updated.length.toString()],
        ['Unchanged', result.unchanged.length.toString()],
      ])
      .write();

    if (result.errors.length > 0) {
      core.setFailed(`Publish completed with ${result.errors.length} errors`);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : 'Unknown error');
  }
}

run();
