import formatConverter from '@/domain/format-conversion/format-converter.service';
import { readFile } from 'fs/promises';
import { describe, expect, it } from 'vitest';

type Example = {
  name: string;
  altMarkdown?: boolean;
  altHtml?: boolean;
  opts?: any;
};

const examples: Example[] = [
  { name: 'text' },
  { name: 'text-escaped' },
  { name: 'text-format', altMarkdown: true },
  { name: 'text-format-nested', altMarkdown: true },
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
  { name: 'headings-text-align-linebreaks', altMarkdown: true },
  { name: 'quotes', altMarkdown: true },
  { name: 'quotes-linebreaks', altMarkdown: true },
  { name: 'quotes-paragraph-break' },
  { name: 'quotes-text-align' },
  { name: 'horizontal-rule', altMarkdown: true },
  { name: 'horizontal-rule-paragraph-break' },
  { name: 'lists-unordered', altMarkdown: true },
  { name: 'lists-unordered-linebreaks', altMarkdown: true },
  { name: 'lists-ordered', altMarkdown: true },
  { name: 'lists-ordered-linebreaks', altMarkdown: true },
  { name: 'lists-check', altMarkdown: true },
  { name: 'lists-check-linebreaks' },
  { name: 'lists-paragraph-break' },
  { name: 'lists-text-align' },
  { name: 'links-manual', altMarkdown: true },
  { name: 'links-manual-text-format' },
  { name: 'links-manual-middle' },
  { name: 'links-autolink' },
  { name: 'links-autolink-middle' },
  {
    name: 'links-autolink-text-format',
    opts: { useUnderscoreForBoldAndItalics: true }
  },
  // { name: 'links-autolink-text-format-expended' }, // FIXME known limitation for now: [*~_=] are allowed in urls
  { name: 'links-with-url-as-text' }
];

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
        expect(formatConverter.toPlainText(json)).toBe(expected);

        // plain text inline, for a preview
        const inlined = formatConverter.toPlainText(json, {
          inline: true
        });
        let _expectedInline;
        if (!expectedInline) {
          _expectedInline = expected.replaceAll(/\n+/g, ' ').trimEnd();
        } else {
          _expectedInline = expectedInline;
        }
        expect(inlined).toBe(_expectedInline);
      });
    });
  });

  describe('should handle markdown', () => {
    examples.forEach(({ name, altMarkdown: alt, opts }) => {
      it(`should generate markdown from lexical (${name})`, async () => {
        const json = await readFile(
          `${__dirname}/_data/${name}/${name}.json`,
          'utf8'
        );
        const expected = await readFile(
          `${__dirname}/_data/${name}/${name}.md`,
          'utf8'
        );
        const markdown = formatConverter.toMarkdown(json, opts);
        expect(markdown).toBe(expected);
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
        const lexical = formatConverter.fromMarkdown(markdown);

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
        const lexical = formatConverter.fromMarkdown(markdown);
        const markdownAgain = formatConverter.toMarkdown(
          JSON.stringify(lexical.obj),
          opts
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
          const lexical = formatConverter.fromMarkdown(markdown);
          const expectedObj = JSON.parse(json, (key, val) => {
            if (key === 'direction') return 'ltr';
            return val;
          });
          expect(lexical.obj).toEqual(expectedObj);
        });
      }
    });
  });

  describe('should handle simple html', () => {
    let i = 0;
    examples.forEach(({ name, altHtml: alt }) => {
      if (i++ > 20) return;
      it(`should generate correct lexical from simple html (${name})`, async () => {
        const json = await readFile(
          `${__dirname}/_data/${name}/${name}.json`,
          'utf8'
        );
        const simpleHtml = await readFile(
          `${__dirname}/_data/${name}/${name}.html`,
          'utf8'
        );
        const lexical = formatConverter.fromSimpleHtml(simpleHtml);

        // direction is a mess to predict, exclude from comparison
        const expectedObj = JSON.parse(json, (key, val) => {
          if (key === 'direction') return 'ltr';
          return val;
        });
        if (lexical.errors) console.error(lexical.errors);
        expect(lexical.obj).toEqual(expectedObj);
      });

      if (alt === true) {
        it(`should generate lexical from simple html (${name}, alt)`, async () => {
          const json = await readFile(
            `${__dirname}/_data/${name}/${name}.json`,
            'utf8'
          );
          const simpleHtml = await readFile(
            `${__dirname}/_data/${name}/${name}.alt.html`,
            'utf8'
          );
          const lexical = formatConverter.fromSimpleHtml(simpleHtml);
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
