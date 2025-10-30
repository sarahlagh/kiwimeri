import formatterService from '@/format-conversion/formatter.service';
import { readFile } from 'fs/promises';
import { describe, it } from 'vitest';
import { examples } from './_data/examples';

describe('format conversion service', () => {
  describe('should generate plaintext from lexical', () => {
    examples.forEach(({ name }) => {
      it(`should generate plaintext from lexical (${name})`, async () => {
        const json = await readFile(
          `${__dirname}/_data/${name}/${name}.json`,
          'utf8'
        );
        const expected = await readFile(
          `${__dirname}/_data/${name}/${name}.txt`,
          'utf8'
        );
        const expectedInline = await readFile(
          `${__dirname}/_data/${name}/${name}.inline.txt`,
          'utf8'
        ).catch(e => {});

        // plain text with line breaks, for visibility
        expect(formatterService.getPlainTextFromLexical(json)).toBe(expected);

        // plain text inline, for a preview
        const inlined = formatterService.getPlainTextFromLexical(json, {
          inline: true
        });
        if (!expectedInline) {
          expect(inlined).toBe(expected.replaceAll(/\n+/g, ' ').trimEnd());
        } else {
          expect(inlined).toBe(expectedInline);
        }
      });
    });
  });

  describe('should generate markdown from lexical', () => {
    examples.forEach(({ name }) => {
      it(`should generate markdown from lexical (${name})`, async () => {
        const json = await readFile(
          `${__dirname}/_data/${name}/${name}.json`,
          'utf8'
        );
        const expected = await readFile(
          `${__dirname}/_data/${name}/${name}.md`,
          'utf8'
        );
        const markdown = formatterService.getMarkdownFromLexical(json);
        expect(markdown).toBe(expected);
      });
    });
  });

  describe('should generate lexical from markdown', () => {
    examples.forEach(({ name }) => {
      it(`should generate lexical from markdown to markdown again (${name})`, async () => {
        const markdown = await readFile(
          `${__dirname}/_data/${name}/${name}.md`,
          'utf8'
        );
        const lexical = formatterService.getLexicalFromMarkdown(markdown);
        const markdownAgain = formatterService.getMarkdownFromLexical(
          JSON.stringify(lexical.obj)
        );
        expect(markdownAgain).toBe(markdown);
      });

      it(`should generate correct lexical from markdown (${name})`, async () => {
        const json = await readFile(
          `${__dirname}/_data/${name}/${name}.json`,
          'utf8'
        );
        const markdown = await readFile(
          `${__dirname}/_data/${name}/${name}.md`,
          'utf8'
        );
        const lexical = formatterService.getLexicalFromMarkdown(markdown);

        // TODO we don't care about getting the exact lexical back
        const newObj = JSON.parse(json, (key, val) => {
          if (key === 'direction') return 'ltr';
          return val;
        });
        expect(lexical.obj).toEqual(newObj);
      });
    });
  });
});
