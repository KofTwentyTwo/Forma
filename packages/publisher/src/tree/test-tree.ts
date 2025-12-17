/**
 * Test the tree builder with real architecture docs
 */

import { TreeBuilder } from './builder.js';
import type { Config } from '../types.js';

const testConfig: Config = {
  version: 1,
  confluence: {
    baseUrl: 'https://greatergoods.atlassian.net/wiki',
    spaceKey: '~712020e0d138319cf440f0a22314fedb3e21f4',
  },
  mappings: [
    {
      localRoot: '/Users/james.maes/Git.Local/dmd/System-Assessments/Plans/2025-AWS_HIPAA_Infrastructure/architecture',
      parentPageId: '1232306183',
      parentPageTitle: 'Architecture',
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
  console.log('Testing with config:', JSON.stringify(testConfig.mappings, null, 2));
  console.log('CWD:', process.cwd());

  const builder = new TreeBuilder(testConfig);
  const result = await builder.build();

  console.log('Tree Builder Test Results\n');
  console.log(`Total pages: ${result.pages.size}`);
  console.log(`Total attachments: ${result.attachments.length}`);
  console.log(`Mapping roots: ${result.mappingRoots.size}\n`);

  console.log('Pages:');
  for (const [key, page] of result.pages) {
    const indent = page.parentKey ? '  ' : '';
    console.log(`${indent}- ${page.title}`);
    console.log(`${indent}  key: ${key}`);
    console.log(`${indent}  parent: ${page.parentKey || '(root)'}`);
    if (page.children.length > 0) {
      console.log(`${indent}  children: ${page.children.length}`);
    }
  }

  if (result.attachments.length > 0) {
    console.log('\nAttachments:');
    for (const att of result.attachments) {
      console.log(`  - ${att.fileName} (${att.mimeType})`);
      console.log(`    owner: ${att.ownerRepoPathKey}`);
    }
  }
}

main().catch(console.error);
