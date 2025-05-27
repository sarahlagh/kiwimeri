import formatterService from '@/format-conversion/formatter.service';
import { readFile } from 'fs/promises';
import { describe, it } from 'vitest';

describe('format conversion service', () => {
  it('should generate plain text from html', () => {
    expect(
      formatterService.getPlainPreview('<html><i>italic text</i> yo</html>')
    ).toBe('italic text yo');

    expect(
      formatterService.getPlainPreview('<html><i>italic text</i> yo<br></html>')
    ).toBe('italic text yo\n');

    expect(
      formatterService.getPlainPreview('<html><p>italic text</p> yo<br></html>')
    ).toBe('italic text\n yo\n');
  });

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
    {
      name: 'everything'
    }
  ];

  describe('should generate plaintext from lexical', () => {
    exemples.forEach(({ name }) => {
      it(`should generate plaintext from lexical (${name})`, async () => {
        const json = await readFile(`${__dirname}/${name}/test.json`, 'utf8');
        const expected = await readFile(
          `${__dirname}/${name}/test.txt`,
          'utf8'
        );

        // plain text inline, for a preview
        expect(
          formatterService.getPlainTextFromLexical(json, { inline: true })
        ).toBe(expected.replaceAll(/\n+/g, ' '));

        // plain text with line breaks, for visibility
        expect(formatterService.getPlainTextFromLexical(json)).toBe(expected);
      });
    });
  });

  describe('should generate markdown from lexical', () => {
    exemples.forEach(({ name }) => {
      it(`should generate markdown from lexical (${name})`, async () => {
        const json = await readFile(`${__dirname}/${name}/test.json`, 'utf8');
        const expected = await readFile(`${__dirname}/${name}/test.md`, 'utf8');
        const markdown = formatterService.getMarkdownFromLexical(json);
        expect(markdown).toBe(expected);
        // expect(markdown).toBe(JSON.stringify(JSON.parse(json)));
      });
    });
  });
});
