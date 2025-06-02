import { MarkdownParser } from '@/format-conversion/parsers/markdown-parser';
import { readFile } from 'fs/promises';
import { describe, it } from 'vitest';
import { exemples } from './examples';

describe('parser', () => {
  it(`should parse`, async () => {
    const parser = new MarkdownParser();
    const resp = parser.parse(
      '#this is a heading test\na text\nanother\n\n---\n\n\nsometext now'
    );
    expect(resp.errors).toBeUndefined();
    expect(resp.obj).toBeDefined();
    expect(resp.obj!.root).toBeDefined();
    expect(resp.obj!.root.children).toHaveLength(5);
  });

  exemples.forEach(({ name }) => {
    it(`should parse ${name} example`, async () => {
      const parser = new MarkdownParser();

      const json = await readFile(`${__dirname}/${name}/${name}.json`, 'utf8');
      const expected = JSON.parse(json) as any;

      const markdown = await readFile(
        `${__dirname}/${name}/${name}.md`,
        'utf8'
      );
      const resp = parser.parse(markdown);
      expect(resp.errors).toBeUndefined();
      expect(resp.obj).toBeDefined();
      expect(resp.obj!.root).toBeDefined();
      console.log(JSON.stringify(resp.obj));
      for (let i = 0; i < resp.obj!.root.children.length; i++) {
        const child = resp.obj!.root.children[i];
        expect(child.type).toBe(expected.root.children[i].type);
        if (!expected.root.children[i].children) {
          expect((child as any).children).toBeUndefined();
        } else {
          expect((child as any).children).toHaveLength(
            expected.root.children[i].children.length
          );
        }
      }
      expect(resp.obj!.root.children).toHaveLength(
        expected.root.children.length
      );
    });
  });
});
