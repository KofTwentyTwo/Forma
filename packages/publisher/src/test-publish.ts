/**
 * End-to-end test: publish architecture docs to Confluence
 */

import { Publisher } from './publisher.js';
import type { Config } from './types.js';

const config: Config = {
  version: 1,
  confluence: {
    baseUrl: process.env.CONFLUENCE_BASE_URL!,
    spaceKey: process.env.CONFLUENCE_SPACE_KEY!,
  },
  mappings: [
    {
      localRoot: '/Users/james.maes/Git.Local/dmd/System-Assessments/Plans/2025-AWS_HIPAA_Infrastructure/architecture',
      parentPageId: process.env.CONFLUENCE_PARENT_PAGE_ID!,
    },
  ],
  publish: {
    include: ['**/*.md'],
    exclude: ['**/node_modules/**', '**/.git/**'],
    allowDelete: false,
    dryRun: false,
  },
  mapping: {
    titleFrom: 'h1-or-filename',
    indexFiles: ['README.md', 'index.md'],
    folderIndexBehavior: 'index-as-folder-page',
    fileNameTitleCase: true,
    preserveNumericPrefixes: true,
    pageTitlePrefix: '',
    pageTitleSuffix: '',
  },
  markdown: {
    mermaidMacro: 'auto-detect',
    enablePlantUmlMacro: false,
    codeBlockTheme: 'default',
    preserveHtml: false,
    convertRelativeLinks: true,
    warnOnCrossMappingLinks: true,
    treatUnknownLinksAsText: true,
  },
  attachments: {
    upload: true,
    uploadStrategy: 'per-page',
    includeGlobs: ['**/*.png', '**/*.jpg', '**/*.pdf'],
    maxBytes: 20000000,
  },
  metadata: {
    addLabelsFromFrontmatter: true,
    addPublishMetadata: true,
  },
  logging: {
    level: 'info',
    showDiffSummary: true,
  },
};

async function main() {
  console.log('Forma - Publishing architecture docs to Confluence\n');

  const publisher = new Publisher({
    config,
    email: process.env.CONFLUENCE_EMAIL!,
    apiToken: process.env.CONFLUENCE_API_TOKEN!,
  });

  const result = await publisher.publish();

  console.log('\n=== Publish Results ===');
  console.log(`Created: ${result.created.length}`);
  result.created.forEach(p => console.log(`  + ${p}`));

  console.log(`Updated: ${result.updated.length}`);
  result.updated.forEach(p => console.log(`  ~ ${p}`));

  console.log(`Unchanged: ${result.unchanged.length}`);
  result.unchanged.forEach(p => console.log(`  = ${p}`));

  if (result.warnings.length > 0) {
    console.log(`Warnings: ${result.warnings.length}`);
    result.warnings.forEach(w => console.log(`  ! ${w}`));
  }

  if (result.errors.length > 0) {
    console.log(`Errors: ${result.errors.length}`);
    result.errors.forEach(e => console.log(`  X ${e}`));
    process.exit(1);
  }

  console.log('\nDone!');
  console.log(`View at: ${config.confluence.baseUrl}/pages/${config.mappings[0].parentPageId}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
