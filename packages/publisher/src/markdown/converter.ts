/**
 * Markdown to Confluence Storage Format converter
 */

export interface ConversionContext {
  pageMap: Map<string, string>; // repoPathKey -> confluencePageId
  currentPageKey: string;
  currentPageId?: string;
  baseDir: string; // Directory of current markdown file
}

interface Token {
  type: string;
  content?: string;
  level?: number;
  items?: Token[][];
  ordered?: boolean;
  lang?: string;
  cells?: string[][];
  header?: string[];
}

export class MarkdownConverter {
  /**
   * Convert markdown to Confluence storage format
   */
  convert(markdown: string, context: ConversionContext): string {
    // Strip frontmatter
    const body = this.stripFrontmatter(markdown);

    // Tokenize
    const tokens = this.tokenize(body);

    // Convert tokens to storage format
    return this.tokensToStorage(tokens, context);
  }

  private stripFrontmatter(content: string): string {
    const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
    return match ? match[1] : content;
  }

  private tokenize(markdown: string): Token[] {
    const tokens: Token[] = [];
    const lines = markdown.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Heading
      // `\s+(\S.*)` keeps the separator and the text disjoint, so matching is linear.
      const headingMatch = line.match(/^(#{1,6})\s+(\S.*)$/);
      if (headingMatch) {
        tokens.push({
          type: 'heading',
          level: headingMatch[1].length,
          content: headingMatch[2],
        });
        i++;
        continue;
      }

      // Code block
      if (line.startsWith('```')) {
        const lang = line.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        tokens.push({
          type: 'code',
          lang: lang || undefined,
          content: codeLines.join('\n'),
        });
        i++; // Skip closing ```
        continue;
      }

      // Horizontal rule
      if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
        tokens.push({ type: 'hr' });
        i++;
        continue;
      }

      // Table
      if (line.includes('|') && i + 1 < lines.length && /^\|?[\s-:|]+\|?$/.test(lines[i + 1])) {
        const tableLines: string[] = [line];
        i++;
        while (i < lines.length && lines[i].includes('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        tokens.push(this.parseTable(tableLines));
        continue;
      }

      // Unordered list
      if (/^[\s]*[-*+]\s/.test(line)) {
        const listItems: Token[][] = [];
        while (i < lines.length && /^[\s]*[-*+]\s/.test(lines[i])) {
          const itemContent = lines[i].replace(/^[\s]*[-*+]\s/, '');
          listItems.push([{ type: 'text', content: itemContent }]);
          i++;
        }
        tokens.push({ type: 'list', ordered: false, items: listItems });
        continue;
      }

      // Ordered list
      if (/^[\s]*\d+\.\s/.test(line)) {
        const listItems: Token[][] = [];
        while (i < lines.length && /^[\s]*\d+\.\s/.test(lines[i])) {
          const itemContent = lines[i].replace(/^[\s]*\d+\.\s/, '');
          listItems.push([{ type: 'text', content: itemContent }]);
          i++;
        }
        tokens.push({ type: 'list', ordered: true, items: listItems });
        continue;
      }

      // Blockquote
      if (line.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        tokens.push({ type: 'blockquote', content: quoteLines.join('\n') });
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Paragraph (collect consecutive non-empty lines)
      const paraLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '' && !this.isBlockStart(lines[i])) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        tokens.push({ type: 'paragraph', content: paraLines.join('\n') });
      }
    }

    return tokens;
  }

  private isBlockStart(line: string): boolean {
    return (
      /^#{1,6}\s/.test(line) ||
      line.startsWith('```') ||
      /^[-*+]\s/.test(line) ||
      /^\d+\.\s/.test(line) ||
      line.startsWith('>') ||
      /^(-{3,}|_{3,}|\*{3,})$/.test(line.trim()) ||
      (line.includes('|') && line.trim().startsWith('|'))
    );
  }

  private parseTable(lines: string[]): Token {
    const parseRow = (line: string): string[] => {
      return line
        .split('|')
        .map(cell => cell.trim())
        .filter((_, i, arr) => i > 0 && i < arr.length - 1 || arr.length === 1);
    };

    const header = parseRow(lines[0]);
    const cells: string[][] = [];

    for (let i = 2; i < lines.length; i++) {
      cells.push(parseRow(lines[i]));
    }

    return { type: 'table', header, cells };
  }

  private tokensToStorage(tokens: Token[], context: ConversionContext): string {
    return tokens.map(token => this.tokenToStorage(token, context)).join('\n');
  }

  private tokenToStorage(token: Token, context: ConversionContext): string {
    switch (token.type) {
      case 'heading':
        return `<h${token.level}>${this.escapeHtml(token.content!)}</h${token.level}>`;

      case 'paragraph':
        return `<p>${this.convertInline(token.content!, context)}</p>`;

      case 'code':
        if (token.lang === 'mermaid') {
          // Mermaid diagram - use code macro with mermaid language
          return this.renderCodeBlock(token.content!, 'mermaid');
        }
        return this.renderCodeBlock(token.content!, token.lang);

      case 'list':
        const listTag = token.ordered ? 'ol' : 'ul';
        const items = token.items!
          .map(itemTokens => {
            const content = itemTokens
              .map(t => t.type === 'text' ? this.convertInline(t.content!, context) : '')
              .join('');
            return `<li>${content}</li>`;
          })
          .join('');
        return `<${listTag}>${items}</${listTag}>`;

      case 'blockquote':
        return `<blockquote><p>${this.convertInline(token.content!, context)}</p></blockquote>`;

      case 'hr':
        return '<hr />';

      case 'table':
        return this.renderTable(token, context);

      default:
        return '';
    }
  }

  private renderCodeBlock(code: string, lang?: string): string {
    // Confluence code macro
    const langAttr = lang ? ` ac:language="${lang}"` : '';
    return `<ac:structured-macro ac:name="code"${langAttr}>` +
      `<ac:plain-text-body><![CDATA[${code}]]></ac:plain-text-body>` +
      `</ac:structured-macro>`;
  }

  private renderTable(token: Token, context: ConversionContext): string {
    let html = '<table><tbody>';

    // Header row
    if (token.header && token.header.length > 0) {
      html += '<tr>';
      for (const cell of token.header) {
        html += `<th>${this.convertInline(cell, context)}</th>`;
      }
      html += '</tr>';
    }

    // Body rows
    if (token.cells) {
      for (const row of token.cells) {
        html += '<tr>';
        for (const cell of row) {
          html += `<td>${this.convertInline(cell, context)}</td>`;
        }
        html += '</tr>';
      }
    }

    html += '</tbody></table>';
    return html;
  }

  private convertInline(text: string, context: ConversionContext): string {
    let result = text;

    // Escape HTML first
    result = this.escapeHtml(result);

    // Bold: **text** or __text__
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
    result = result.replace(/_(.+?)_/g, '<em>$1</em>');

    // Inline code: `code`
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Strikethrough: ~~text~~
    result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Images: ![alt](url)
    result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      return this.convertImage(alt, url, context);
    });

    // Links: [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      return this.convertLink(text, url, context);
    });

    // Line breaks
    result = result.replace(/\n/g, '<br />');

    return result;
  }

  private convertImage(alt: string, url: string, context: ConversionContext): string {
    // External URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return `<ac:image><ri:url ri:value="${this.escapeHtml(url)}" /></ac:image>`;
    }

    // Local attachment - reference by filename
    const fileName = url.split('/').pop() || url;
    return `<ac:image><ri:attachment ri:filename="${this.escapeHtml(fileName)}" /></ac:image>`;
  }

  private convertLink(text: string, url: string, context: ConversionContext): string {
    // External URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return `<a href="${this.escapeHtml(url)}">${text}</a>`;
    }

    // Anchor link
    if (url.startsWith('#')) {
      return `<a href="${this.escapeHtml(url)}">${text}</a>`;
    }

    // Relative link to another markdown file
    if (url.endsWith('.md')) {
      // Try to resolve to Confluence page
      // For now, just render as text (would need page map populated)
      return `<span>${text}</span>`;
    }

    // Link to attachment (PDF, etc.)
    const fileName = url.split('/').pop() || url;
    return `<ac:link><ri:attachment ri:filename="${this.escapeHtml(fileName)}" /><ac:plain-text-link-body><![CDATA[${text}]]></ac:plain-text-link-body></ac:link>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
