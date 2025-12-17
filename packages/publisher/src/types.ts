/**
 * Configuration types for Forma publisher
 */

export interface Config {
  version: number;
  confluence: ConfluenceConfig;
  mappings: Mapping[];
  publish: PublishConfig;
  mapping: MappingConfig;
  markdown: MarkdownConfig;
  attachments: AttachmentConfig;
  metadata: MetadataConfig;
  logging: LoggingConfig;
}

export interface ConfluenceConfig {
  baseUrl: string;
  spaceKey: string;
}

export interface Mapping {
  localRoot: string;
  parentPageId?: string;
  parentPageTitle?: string;
}

export interface PublishConfig {
  include: string[];
  exclude: string[];
  allowDelete: boolean;
  dryRun: boolean;
}

export interface MappingConfig {
  titleFrom: 'h1-or-filename' | 'filename' | 'frontmatter';
  indexFiles: string[];
  folderIndexBehavior: 'index-as-folder-page' | 'folder-as-container-only';
  fileNameTitleCase: boolean;
  preserveNumericPrefixes: boolean;
  pageTitlePrefix: string;
  pageTitleSuffix: string;
}

export interface MarkdownConfig {
  mermaidMacro: 'auto-detect' | 'enabled' | 'disabled';
  enablePlantUmlMacro: boolean;
  codeBlockTheme: string;
  preserveHtml: boolean;
  convertRelativeLinks: boolean;
  warnOnCrossMappingLinks: boolean;
  treatUnknownLinksAsText: boolean;
}

export interface AttachmentConfig {
  upload: boolean;
  uploadStrategy: 'per-page';
  includeGlobs: string[];
  maxBytes: number;
}

export interface MetadataConfig {
  addLabelsFromFrontmatter: boolean;
  addPublishMetadata: boolean;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  showDiffSummary: boolean;
}

export interface PageNode {
  repoPathKey: string;
  sourcePath: string;
  title: string;
  parentKey: string | null;
  confluencePageId?: string;
  children: string[];
  contentHash?: string;
  labels?: string[];
}

export interface AttachmentRef {
  ownerRepoPathKey: string;
  sourcePath: string;
  fileName: string;
  mimeType?: string;
}

export interface PublishResult {
  created: string[];
  updated: string[];
  unchanged: string[];
  warnings: string[];
  errors: string[];
}

export interface LintResult {
  valid: boolean;
  errors: LintError[];
  warnings: LintWarning[];
}

export interface LintError {
  file: string;
  line?: number;
  message: string;
  code: string;
}

export interface LintWarning {
  file: string;
  line?: number;
  message: string;
  code: string;
}
