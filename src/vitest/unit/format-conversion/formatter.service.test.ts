import formatterService from '@/format-conversion/formatter.service';
import { readFile } from 'fs/promises';
import { describe, it } from 'vitest';

describe('format conversion service', () => {
  const exemples = [
    { name: 'text' },
    {
      name: 'simple'
    },
    {
      name: 'paragraph'
    },
    {
      name: 'header'
    },
    {
      name: 'hline'
    },
    {
      name: 'quote'
    },
    { name: 'lists' },
    { name: 'text-align' },
    {
      name: 'everything'
    }
  ];

  describe('should generate plaintext from lexical', () => {
    exemples.forEach(({ name }) => {
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
    exemples.forEach(({ name }) => {
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

      it.todo(`should generate lexical from markdown (${name})`, async () => {
        const json = await readFile(
          `${__dirname}/${name}/${name}.json`,
          'utf8'
        );
        const markdown = formatterService.getMarkdownFromLexical(json);
        expect(formatterService.getLexicalFromMarkdown(markdown)).toBe(
          JSON.stringify(JSON.parse(json))
        );
      });
    });
  });
});
