import { MarkdownParser } from '@/format-conversion/parsers/markdown-parser';
import { readFile } from 'fs/promises';
import { describe, it } from 'vitest';
import { examples } from './examples';

describe('parser', () => {
  it(`should parse first exemple`, async () => {
    const parser = new MarkdownParser();
    const resp = parser.parse(
      '#this is a heading test\na text\nanother\n\n---\n\n\nsometext now'
    );
    expect(resp.errors).toBeUndefined();
    expect(resp.obj).toBeDefined();
    expect(resp.obj!.root).toBeDefined();
    expect(resp.obj!.root.children).toHaveLength(5);
  });

  examples.forEach(({ name }) => {
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
        const expectedChild = expected.root.children[i];
        expect(child.type).toBe(expectedChild.type);
        if (!expectedChild.children) {
          expect((child as any).children).toBeUndefined();
        } else {
          expect((child as any).children).toHaveLength(
            expectedChild.children.length
          );

          for (let j = 0; j < expectedChild.children.length; j++) {
            const subChild = (child as any).children[j];
            const expectedSubChild = expectedChild.children[j];
            if (expectedSubChild.text) {
              expect((subChild as any).text).toBe(expectedSubChild.text);
            }
            if (expectedSubChild.children) {
              expect((subChild as any).children.length).toBe(
                expectedSubChild.children.length
              );
              expect((subChild as any).children).toEqual(
                expectedSubChild.children
              );
            }
            expect({ ...subChild, children: null }).toEqual({
              ...expectedSubChild,
              children: null
            });
          }
        }
        expect({ ...child, children: null }).toEqual({
          ...expectedChild,
          children: null
        });
      }
      expect(resp.obj!.root.children).toHaveLength(
        expected.root.children.length
      );
    });
  });
});
