import { MarkdownParser } from '@/format-conversion/parsers/markdown-parser';
import { readFile } from 'fs/promises';
import { SerializedElementNode, SerializedTextNode } from 'lexical';
import { describe, it } from 'vitest';

describe('parser', () => {
  it.skip(`should parse first exemple`, async () => {
    const parser = new MarkdownParser();
    const resp = parser.parse(
      '#this is a heading test\na text\nanother\n\n---\n\n\nsometext now'
    );
    expect(resp.errors).toBeUndefined();
    expect(resp.obj).toBeDefined();
    expect(resp.obj!.root).toBeDefined();
    expect(resp.obj!.root.children).toHaveLength(5);
  });

  it(`should parse variations`, async () => {
    const parser = new MarkdownParser();
    [
      'this is a _test_ with __variations__',
      'this is a *test* with **variations**'
    ].forEach(str => {
      const resp = parser.parse(str);
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(1);
      expect(resp.obj!.root.children[0].type).toBe('paragraph');
      expect('children' in resp.obj!.root.children[0]).toBe(true);
      const node = resp.obj!.root.children[0] as SerializedElementNode;
      expect(node.children).toHaveLength(4);
      expect(node.children.map(c => (c as SerializedTextNode).format)).toEqual([
        0, 2, 0, 1
      ]);
    });
  });

  ['nonEscaped', 'impossibleBlocks'].forEach(errorExample => {
    it.skip(`should not parse example ${errorExample}`, async () => {
      const parser = new MarkdownParser();
      const markdown = await readFile(
        `${__dirname}/_data/errors/${errorExample}.md`,
        'utf8'
      );
      const expected = await readFile(
        `${__dirname}/_data/errors/${errorExample}.json`,
        'utf8'
      );
      const resp = parser.parse(markdown);
      expect(resp).toBeDefined();
      expect(resp.obj).toBeNull();
      expect(resp.errors).toEqual(JSON.parse(expected));
    });
  });

  it.skip('should parse tricky scenarios', async () => {
    const parser = new MarkdownParser();
    const markdown = await readFile(
      `${__dirname}/_data/tricks/tricks.md`,
      'utf8'
    );
    const resp = parser.parse(markdown);
    expect(resp).toBeDefined();
    expect(resp.errors).toBeUndefined();
    expect(resp.obj).not.toBeNull();

    console.debug(JSON.stringify(resp));
    expect(resp.obj!.root.children).toHaveLength(5);

    let child: any = resp.obj!.root.children[0];
    expect(child.type).toBe('paragraph');
    expect(child.children).toHaveLength(1);
    expect(child.children[0].text).toBe('this is a paragraph');

    child = resp.obj!.root.children[1];
    expect(child.type).toBe('paragraph');
    expect(child.format).toBe('center');
    expect(child.children).toHaveLength(2);
    expect(child.children[0].text).toBe('~~~');
    expect(child.children[1].type).toBe('linebreak');

    child = resp.obj!.root.children[2];
    expect(child.type).toBe('paragraph');
    expect(child.children).toHaveLength(1);
    expect(child.children[0].type).toBe('text');
    expect(child.children[0].text).toBe('this is another paragraph');

    child = resp.obj!.root.children[3];
    expect(child.type).toBe('paragraph');
    expect(child.children).toHaveLength(6);
    expect(child.children[0].text).toBe('now this is a block');
    expect(child.children[1].type).toBe('linebreak');
    expect(child.children[2].text).toBe('with text align in the middle');
    expect(child.children[3].type).toBe('linebreak');
    expect(child.children[4].type).toBe('linebreak');
    expect(child.children[5].text).toBe('and the closing line');

    child = resp.obj!.root.children[4];
    expect(child.type).toBe('paragraph');
    expect(child.children).toHaveLength(9);
    expect(child.children[0].text).toBe('a block with a list');
    expect(child.children[1].type).toBe('linebreak');
    expect(child.children[2].text).toBe('- item 1');
    expect(child.children[3].type).toBe('linebreak');
    expect(child.children[4].text).toBe('- item 2');
    expect(child.children[5].type).toBe('linebreak');
    expect(child.children[6].text).toBe('- item 3');
    expect(child.children[7].type).toBe('linebreak');
    expect(child.children[8].text).toBe("and the closing line... it's tricky");
  });

  describe(`should parse heading blocks`, () => {
    it(`should match the end of content`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse('# first line');
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(1);
      expect(resp.obj!.root.children[0].type).toBe('heading');
    });

    it(`a header should start by #'s and a space`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse('#H1 this is not a header but a paragraph\n\n');
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(1);
      expect(resp.obj!.root.children[0].type).toBe('paragraph');
    });

    it(`a header should be preceded by \\n\\n`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse(
        'this will produce a single paragraph with # left in text\n# H1'
      );
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(1);
      expect(resp.obj!.root.children[0].type).toBe('paragraph');
      const paragraph = resp.obj!.root.children[0] as SerializedElementNode;
      expect(paragraph.children).toHaveLength(3);
      expect((paragraph.children[2] as SerializedTextNode).text).toBe('# H1');
    });

    it(`a header should end with \\n\\n`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse('# H1\nthis will be part of the heading too');
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(1);
      expect(resp.obj!.root.children[0].type).toBe('heading');
      const heading = resp.obj!.root.children[0] as SerializedElementNode;
      expect(heading.children).toHaveLength(3);
      expect((heading.children[2] as SerializedTextNode).text).toBe(
        'this will be part of the heading too'
      );
    });

    it(`an escaped # will not result in a heading`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse('\\# this is not a heading');
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(1);
      expect(resp.obj!.root.children[0].type).toBe('paragraph');
      const paragraph = resp.obj!.root.children[0] as SerializedElementNode;
      expect(paragraph.children).toHaveLength(1);
      expect((paragraph.children[0] as SerializedTextNode).text).toBe(
        '# this is not a heading'
      );
    });
  });

  describe(`should parse quote blocks`, () => {
    it(`should match the end of content`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse('> first line\n');
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(1);
      expect(resp.obj!.root.children[0].type).toBe('quote');
      const quote = resp.obj!.root.children[0] as SerializedElementNode;
      expect(quote.children).toHaveLength(1);
      expect((quote.children[0] as SerializedTextNode).text).toBe('first line');
    });

    it(`a quote should start by > and a space`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse('>this is not a quote but a paragraph\n\n');
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(1);
      expect(resp.obj!.root.children[0].type).toBe('paragraph');
    });

    it(`an escaped > will not result in a quote`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse('\\> this is not a quote');
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(1);
      expect(resp.obj!.root.children[0].type).toBe('paragraph');
      const paragraph = resp.obj!.root.children[0] as SerializedElementNode;
      expect(paragraph.children).toHaveLength(1);
      expect((paragraph.children[0] as SerializedTextNode).text).toBe(
        '> this is not a quote'
      );
    });
  });

  describe(`should parse horizontal rules`, () => {
    it(`should match the end of content`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse('---');
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(1);
      expect(resp.obj!.root.children[0].type).toBe('horizontalrule');
    });

    it(`a hrule should be preceded by \\n\\n`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse(
        'this will produce a single paragraph with --- left in text\n---'
      );
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(1);
      expect(resp.obj!.root.children[0].type).toBe('paragraph');
      const paragraph = resp.obj!.root.children[0] as SerializedElementNode;
      expect(paragraph.children).toHaveLength(3);
      expect((paragraph.children[2] as SerializedTextNode).text).toBe('---');
    });

    it(`a hrule should end with \\n or \\n\\n`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse('---\nthis will be a paragraph');
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(2);
      expect(resp.obj!.root.children[0].type).toBe('horizontalrule');
      const paragraph = resp.obj!.root.children[1] as SerializedElementNode;
      expect(paragraph.children).toHaveLength(1);
      expect((paragraph.children[0] as SerializedTextNode).text).toBe(
        'this will be a paragraph'
      );
    });

    it(`two adjacent hrules may be separated by \\n\\n`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse('---\n\n---');
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(2);
      expect(resp.obj!.root.children[0].type).toBe('horizontalrule');
      expect(resp.obj!.root.children[1].type).toBe('horizontalrule');
    });

    it(`two adjacent hrules may be separated by \\n`, async () => {
      const parser = new MarkdownParser();
      const resp = parser.parse('---\n---');
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      expect(resp.obj!.root.children).toHaveLength(2);
      expect(resp.obj!.root.children[0].type).toBe('horizontalrule');
      expect(resp.obj!.root.children[1].type).toBe('horizontalrule');
    });
  });
});
