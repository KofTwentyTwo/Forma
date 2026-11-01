import { describe, expect, it } from 'vitest';
import { MarkdownConverter, type ConversionContext } from './converter.js';

const context: ConversionContext = {
  pageMap: new Map(),
  currentPageKey: 'docs/a.md',
  baseDir: 'docs',
};

const convert = (markdown: string): string => new MarkdownConverter().convert(markdown, context);

describe('MarkdownConverter', () => {
  it('converts headings and escapes HTML in them', () => {
    expect(convert('## Fish & <Chips>')).toBe('<h2>Fish &amp; &lt;Chips&gt;</h2>');
  });

  it('converts inline emphasis, code and external links in a paragraph', () => {
    const html = convert('Some **bold**, *italic*, `code` and [a link](https://example.com/x).');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<a href="https://example.com/x">a link</a>');
  });

  it('renders a fenced code block as a Confluence code macro with the language', () => {
    const html = convert('```mermaid\ngraph TD; A-->B\n```');
    expect(html).toContain('<ac:structured-macro ac:name="code" ac:language="mermaid">');
    expect(html).toContain('<![CDATA[graph TD; A-->B]]>');
  });

  it('renders bullet and numbered lists with the right tags', () => {
    expect(convert('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
    expect(convert('1. one\n2. two')).toBe('<ol><li>one</li><li>two</li></ol>');
  });

  it('references a local image as an attachment by file name', () => {
    expect(convert('![diagram](images/arch.png)')).toContain('<ri:attachment ri:filename="arch.png" />');
  });

  it('drops front matter from the page body', () => {
    const html = convert('---\ntitle: Hidden\n---\n# Visible');
    expect(html).toBe('<h1>Visible</h1>');
  });
});
