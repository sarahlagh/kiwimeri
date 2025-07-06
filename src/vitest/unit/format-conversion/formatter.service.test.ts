import formatterService from '@/format-conversion/formatter.service';
import { readFile } from 'fs/promises';
import { describe, it } from 'vitest';
import { examples } from './examples';

describe('format conversion service', () => {
  describe('should generate plaintext from lexical', () => {
    examples.forEach(({ name }) => {
      it(`should generate plaintext from lexical (${name})`, async () => {
        const json = await readFile(
          `${__dirname}/${name}/${name}.json`,
          'utf8'
        );
        const expected = await readFile(
          `${__dirname}/${name}/${name}.txt`,
          'utf8'
        );

        // plain text inline, for a preview
        expect(
          formatterService.getPlainTextFromLexical(json, { inline: true })
        ).toBe(expected.replaceAll(/\n+/g, ' ').trimEnd());

        // plain text with line breaks, for visibility
        expect(formatterService.getPlainTextFromLexical(json)).toBe(expected);
      });
    });
  });

  describe('should generate markdown from lexical', () => {
    examples.forEach(({ name }) => {
      it(`should generate markdown from lexical (${name})`, async () => {
        const json = await readFile(
          `${__dirname}/${name}/${name}.json`,
          'utf8'
        );
        const expected = await readFile(
          `${__dirname}/${name}/${name}.md`,
          'utf8'
        );
        const markdown = formatterService.getMarkdownFromLexical(json);
        expect(markdown).toBe(expected);
      });

      // skip because of inconsistent generation of direction: ltr or null on Lexical side...
      it.skip(`should generate lexical from markdown (${name})`, async () => {
        const json = await readFile(
          `${__dirname}/${name}/${name}.json`,
          'utf8'
        );
        const markdown = await readFile(
          `${__dirname}/${name}/${name}.md`,
          'utf8'
        );
        const lexical = formatterService.getLexicalFromMarkdown(markdown);
        expect(lexical).toEqual(JSON.parse(json));
      });
    });
  });
});
