import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TreeBuilder } from './builder.js';
import type { Config } from '../types.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'forma-tree-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function configFor(localRoot: string): Config {
  return {
    version: 1,
    confluence: { baseUrl: 'https://example.atlassian.net/wiki', spaceKey: 'DOC' },
    mappings: [{ localRoot }],
    publish: { include: ['**/*.md'], exclude: ['**/drafts/**'], allowDelete: false, dryRun: true },
    mapping: {
      titleFrom: 'h1-or-filename',
      indexFiles: ['README.md', 'index.md'],
      folderIndexBehavior: 'index-as-folder-page',
      fileNameTitleCase: false,
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
    attachments: { upload: true, uploadStrategy: 'per-page', includeGlobs: ['**/*.png'], maxBytes: 1_000_000 },
    metadata: { addLabelsFromFrontmatter: true, addPublishMetadata: false },
    logging: { level: 'info', showDiffSummary: false },
  };
}

describe('TreeBuilder', () => {
  it('builds one page per markdown file, titled from the first H1, and ignores other files', async () => {
    await writeFile(join(root, 'index.md'), '# Home\n\nWelcome.');
    await writeFile(join(root, 'guide.md'), '# The Guide\n\nText.');
    await writeFile(join(root, 'notes.txt'), 'not markdown');

    const result = await new TreeBuilder(configFor(root)).build();

    const titles = [...result.pages.values()].map(page => page.title).sort();
    expect(titles).toEqual(['Home', 'The Guide']);
  });

  it('falls back to the file name when there is no H1', async () => {
    await writeFile(join(root, 'untitled.md'), 'Just text.');

    const result = await new TreeBuilder(configFor(root)).build();

    expect([...result.pages.values()].map(page => page.title)).toEqual(['untitled']);
  });

  it('honours publish.exclude and records nested pages', async () => {
    await mkdir(join(root, 'drafts'));
    await mkdir(join(root, 'sub'));
    await writeFile(join(root, 'drafts', 'wip.md'), '# Work in progress');
    await writeFile(join(root, 'sub', 'page.md'), '# Nested');

    const result = await new TreeBuilder(configFor(root)).build();

    const titles = [...result.pages.values()].map(page => page.title);
    expect(titles).toContain('Nested');
    expect(titles).not.toContain('Work in progress');
  });

  it('reports local image references as attachments owned by their page', async () => {
    await writeFile(join(root, 'img.md'), '# Pic\n\n![diagram](arch.png)');
    await writeFile(join(root, 'arch.png'), 'x');

    const result = await new TreeBuilder(configFor(root)).build();

    expect(result.attachments.map(a => a.fileName)).toContain('arch.png');
  });
});
