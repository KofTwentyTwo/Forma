/**
 * Builds page tree from local file system
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, dirname, basename, extname } from 'node:path';
import type { Config, PageNode, AttachmentRef, Mapping } from '../types.js';

export interface TreeResult {
  pages: Map<string, PageNode>;
  attachments: AttachmentRef[];
  mappingRoots: Map<string, string>; // localRoot -> root page key
}

interface FrontMatter {
  title?: string;
  labels?: string[];
}

export class TreeBuilder {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async build(): Promise<TreeResult> {
    const pages = new Map<string, PageNode>();
    const attachments: AttachmentRef[] = [];
    const mappingRoots = new Map<string, string>();

    for (const mapping of this.config.mappings) {
      const result = await this.buildMapping(mapping);

      // Merge results
      for (const [key, page] of result.pages) {
        pages.set(key, page);
      }
      attachments.push(...result.attachments);

      if (result.rootKey) {
        mappingRoots.set(mapping.localRoot, result.rootKey);
      }
    }

    return { pages, attachments, mappingRoots };
  }

  private async buildMapping(mapping: Mapping): Promise<{
    pages: Map<string, PageNode>;
    attachments: AttachmentRef[];
    rootKey: string | null;
  }> {
    const pages = new Map<string, PageNode>();
    const attachments: AttachmentRef[] = [];

    const absoluteRoot = mapping.localRoot.startsWith('/')
      ? mapping.localRoot
      : join(process.cwd(), mapping.localRoot);

    // Walk the directory tree
    const files = await this.walkDirectory(absoluteRoot);

    // Filter to markdown files matching include/exclude
    const mdFiles = files.filter(f => this.shouldInclude(f, absoluteRoot));

    // Build page nodes
    for (const filePath of mdFiles) {
      const relPath = relative(absoluteRoot, filePath);
      const repoPathKey = `${mapping.localRoot}/${relPath}`;

      const content = await readFile(filePath, 'utf-8');
      const { frontMatter, body } = this.parseFrontMatter(content);
      const title = this.extractTitle(filePath, body, frontMatter);

      // Determine parent
      const parentKey = this.getParentKey(relPath, mapping.localRoot, pages);

      // Collect attachment references from markdown
      const refs = this.extractAttachmentRefs(body, filePath, repoPathKey);
      attachments.push(...refs);

      const node: PageNode = {
        repoPathKey,
        sourcePath: filePath,
        title,
        parentKey,
        children: [],
        labels: frontMatter.labels,
      };

      pages.set(repoPathKey, node);

      // Update parent's children
      if (parentKey && pages.has(parentKey)) {
        pages.get(parentKey)!.children.push(repoPathKey);
      }
    }

    // Sort children by ordering rules
    for (const page of pages.values()) {
      page.children = this.sortChildren(page.children, pages);
    }

    // Find the root key (index file at root level)
    const rootKey = this.findRootKey(mapping.localRoot, pages);

    return { pages, attachments, rootKey };
  }

  private async walkDirectory(dir: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!this.isExcludedDir(entry.name)) {
            const subFiles = await this.walkDirectory(fullPath);
            results.push(...subFiles);
          }
        } else if (entry.isFile()) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      console.warn(`Warning: Could not read directory ${dir}`);
    }

    return results;
  }

  private isExcludedDir(name: string): boolean {
    const excludedDirs = ['node_modules', '.git', '.idea', 'target', 'dist'];
    return excludedDirs.includes(name) || name.startsWith('.');
  }

  private shouldInclude(filePath: string, root: string): boolean {
    const relPath = relative(root, filePath);
    const ext = extname(filePath).toLowerCase();

    // Must be markdown
    if (ext !== '.md') {
      return false;
    }

    // Check exclude patterns
    for (const pattern of this.config.publish.exclude) {
      if (this.matchGlob(relPath, pattern)) {
        return false;
      }
    }

    // Check include patterns
    for (const pattern of this.config.publish.include) {
      if (this.matchGlob(relPath, pattern)) {
        return true;
      }
    }

    return false;
  }

  private matchGlob(path: string, pattern: string): boolean {
    // Simple glob matching (supports * and **)
    // **/*.md should match both foo.md and dir/foo.md

    // Special case: **/*.ext matches any file with that extension at any depth
    if (pattern.startsWith('**/')) {
      const suffix = pattern.slice(3); // e.g., "*.md"
      if (suffix.startsWith('*')) {
        // **/*.md -> matches *.md at any depth
        const ext = suffix.slice(1); // ".md"
        return path.endsWith(ext);
      }
    }

    // General glob to regex conversion
    let regexStr = '';
    for (let i = 0; i < pattern.length; i++) {
      const c = pattern[i];
      if (c === '*') {
        if (pattern[i + 1] === '*') {
          // **
          if (pattern[i + 2] === '/') {
            regexStr += '(?:.*/)?';
            i += 2;
          } else {
            regexStr += '.*';
            i += 1;
          }
        } else {
          regexStr += '[^/]*';
        }
      } else if (c === '?') {
        regexStr += '[^/]';
      } else if (c === '.') {
        regexStr += '\\.';
      } else {
        regexStr += c;
      }
    }

    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(path);
  }

  private parseFrontMatter(content: string): { frontMatter: FrontMatter; body: string } {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

    if (!match) {
      return { frontMatter: {}, body: content };
    }

    const frontMatterText = match[1];
    const body = match[2];

    // Simple YAML parsing for title and labels
    const frontMatter: FrontMatter = {};

    const titleMatch = frontMatterText.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (titleMatch) {
      frontMatter.title = titleMatch[1];
    }

    const labelsMatch = frontMatterText.match(/^labels:\s*\[(.*)\]\s*$/m);
    if (labelsMatch) {
      frontMatter.labels = labelsMatch[1].split(',').map(l => l.trim().replace(/["']/g, ''));
    }

    return { frontMatter, body };
  }

  private extractTitle(filePath: string, body: string, frontMatter: FrontMatter): string {
    const titleFrom = this.config.mapping.titleFrom;
    const fileName = basename(filePath, '.md');

    // From frontmatter
    if (titleFrom === 'frontmatter' && frontMatter.title) {
      return this.normalizeTitle(frontMatter.title);
    }

    // From H1 or filename
    if (titleFrom === 'h1-or-filename' || titleFrom === 'frontmatter') {
      const h1Match = body.match(/^#\s+(.+)$/m);
      if (h1Match) {
        return this.normalizeTitle(h1Match[1]);
      }
    }

    // From filename
    return this.normalizeTitle(fileName);
  }

  private normalizeTitle(title: string): string {
    let normalized = title;

    // Replace - and _ with spaces (but preserve numeric prefixes if configured)
    if (this.config.mapping.preserveNumericPrefixes) {
      // Keep numeric prefix, normalize the rest
      const match = normalized.match(/^(\d+[-_]?)(.*)$/);
      if (match) {
        normalized = match[1].replace(/[-_]$/, ' ') + match[2].replace(/[-_]/g, ' ');
      } else {
        normalized = normalized.replace(/[-_]/g, ' ');
      }
    } else {
      normalized = normalized.replace(/[-_]/g, ' ');
    }

    // Title case if configured
    if (this.config.mapping.fileNameTitleCase) {
      normalized = normalized
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Apply prefix/suffix
    if (this.config.mapping.pageTitlePrefix) {
      normalized = this.config.mapping.pageTitlePrefix + normalized;
    }
    if (this.config.mapping.pageTitleSuffix) {
      normalized = normalized + this.config.mapping.pageTitleSuffix;
    }

    // Enforce Confluence title length limit
    if (normalized.length > 255) {
      normalized = normalized.slice(0, 252) + '...';
    }

    return normalized.trim();
  }

  private getParentKey(
    relPath: string,
    localRoot: string,
    pages: Map<string, PageNode>
  ): string | null {
    const dir = dirname(relPath);
    const fileName = basename(relPath);

    // If at root level
    if (dir === '.') {
      // If this is an index file, parent is the mapping root (Confluence parent)
      if (this.isIndexFile(fileName)) {
        return null; // Will be handled as mapping root
      }
      // Otherwise, parent is the index file at root
      for (const indexFile of this.config.mapping.indexFiles) {
        const indexKey = `${localRoot}/${indexFile}`;
        if (pages.has(indexKey)) {
          return indexKey;
        }
      }
      return null;
    }

    // Look for index file in parent directory
    if (this.config.mapping.folderIndexBehavior === 'index-as-folder-page') {
      for (const indexFile of this.config.mapping.indexFiles) {
        const indexKey = `${localRoot}/${dir}/${indexFile}`;
        if (pages.has(indexKey)) {
          return indexKey;
        }
      }
    }

    // Fall back to parent directory's index
    const parentDir = dirname(dir);
    if (parentDir !== '.') {
      for (const indexFile of this.config.mapping.indexFiles) {
        const indexKey = `${localRoot}/${parentDir}/${indexFile}`;
        if (pages.has(indexKey)) {
          return indexKey;
        }
      }
    }

    return null;
  }

  private isIndexFile(fileName: string): boolean {
    return this.config.mapping.indexFiles.includes(fileName);
  }

  private findRootKey(localRoot: string, pages: Map<string, PageNode>): string | null {
    for (const indexFile of this.config.mapping.indexFiles) {
      const key = `${localRoot}/${indexFile}`;
      if (pages.has(key)) {
        return key;
      }
    }
    return null;
  }

  private extractAttachmentRefs(
    body: string,
    sourcePath: string,
    ownerRepoPathKey: string
  ): AttachmentRef[] {
    const refs: AttachmentRef[] = [];
    const sourceDir = dirname(sourcePath);

    // Match markdown images: ![alt](path)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = imageRegex.exec(body)) !== null) {
      const imagePath = match[2];

      // Skip external URLs
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        continue;
      }

      // Resolve relative path
      const absolutePath = imagePath.startsWith('/')
        ? imagePath
        : join(sourceDir, imagePath);

      const fileName = basename(imagePath);
      const ext = extname(fileName).toLowerCase();

      // Check if it's an allowed attachment type
      const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'];
      if (allowedExts.includes(ext)) {
        refs.push({
          ownerRepoPathKey,
          sourcePath: absolutePath,
          fileName,
          mimeType: this.getMimeType(ext),
        });
      }
    }

    // Match markdown links to PDFs: [text](path.pdf)
    const linkRegex = /\[([^\]]*)\]\(([^)]+\.pdf)\)/gi;
    while ((match = linkRegex.exec(body)) !== null) {
      const linkPath = match[2];

      if (linkPath.startsWith('http://') || linkPath.startsWith('https://')) {
        continue;
      }

      const absolutePath = linkPath.startsWith('/')
        ? linkPath
        : join(sourceDir, linkPath);

      refs.push({
        ownerRepoPathKey,
        sourcePath: absolutePath,
        fileName: basename(linkPath),
        mimeType: 'application/pdf',
      });
    }

    return refs;
  }

  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private sortChildren(children: string[], pages: Map<string, PageNode>): string[] {
    return children.sort((a, b) => {
      const pageA = pages.get(a)!;
      const pageB = pages.get(b)!;
      const fileNameA = basename(pageA.sourcePath);
      const fileNameB = basename(pageB.sourcePath);

      // Index files first
      const aIsIndex = this.isIndexFile(fileNameA);
      const bIsIndex = this.isIndexFile(fileNameB);
      if (aIsIndex && !bIsIndex) return -1;
      if (!aIsIndex && bIsIndex) return 1;

      // Numeric prefix ordering
      const numA = this.extractNumericPrefix(fileNameA);
      const numB = this.extractNumericPrefix(fileNameB);
      if (numA !== null && numB !== null) {
        return numA - numB;
      }
      if (numA !== null) return -1;
      if (numB !== null) return 1;

      // Alphabetical
      return pageA.title.localeCompare(pageB.title);
    });
  }

  private extractNumericPrefix(fileName: string): number | null {
    const match = fileName.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }
}
