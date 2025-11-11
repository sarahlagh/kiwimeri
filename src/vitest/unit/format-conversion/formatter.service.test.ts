import formatterService from '@/format-conversion/formatter.service';
import { readFile } from 'fs/promises';
import { describe, it } from 'vitest';

const examples = [
  { name: 'text' },
  { name: 'text-escaped' },
  { name: 'text-format', alt: true },
  { name: 'text-format-nested', alt: true },
  { name: 'paragraph' },
  { name: 'paragraph-linebreaks' },
  { name: 'paragraph-text-align' },
  { name: 'paragraph-text-align-linebreaks' },
  { name: 'paragraph-empty' },
  { name: 'paragraph-empty-text-align' },
  { name: 'paragraph-empty-text-align-linebreaks' },
  { name: 'headings' },
  { name: 'headings-linebreaks' },
  { name: 'headings-text-align' },
  { name: 'headings-text-align-linebreaks', alt: true },
  { name: 'quotes', alt: true },
  { name: 'quotes-linebreaks', alt: true },
  { name: 'quotes-paragraph-break' },
  { name: 'quotes-text-align' },
  { name: 'horizontal-rule', alt: true },
  { name: 'horizontal-rule-paragraph-break' },
  { name: 'lists-unordered', alt: true },
  { name: 'lists-unordered-linebreaks', alt: true },
  { name: 'lists-ordered', alt: true },
  { name: 'lists-ordered-linebreaks', alt: true },
  { name: 'lists-paragraph-break' },
  { name: 'lists-text-align' }
  // { name: 'links-manual-with-title' },
  // { name: 'links-manual-without-title' },
  // { name: 'links-autolink' },
  // { name: 'links-autolink-disabled' }
];

// TODO test error non-escaped chars

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
    examples.forEach(({ name, alt }) => {
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

        // direction is a mess to predict, exclude from comparison
        const expectedObj = JSON.parse(json, (key, val) => {
          if (key === 'direction') return 'ltr';
          return val;
        });
        expect(lexical.obj).toEqual(expectedObj);
      });

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

      if (alt === true) {
        it(`should generate lexical from markdown (${name}, alt)`, async () => {
          const json = await readFile(
            `${__dirname}/_data/${name}/${name}.json`,
            'utf8'
          );
          const markdown = await readFile(
            `${__dirname}/_data/${name}/${name}.alt.md`,
            'utf8'
          );
          const lexical = formatterService.getLexicalFromMarkdown(markdown);
          const expectedObj = JSON.parse(json, (key, val) => {
            if (key === 'direction') return 'ltr';
            return val;
          });
          expect(lexical.obj).toEqual(expectedObj);
        });
      }
    });
  });
});
