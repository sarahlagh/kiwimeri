import { lexicalConfig } from '@/common/wysiwyg/lexical/lexical-config';
import {
  searchLexicalState,
  SearchLexicalStateOptions
} from '@/common/wysiwyg/lexical/searchLexicalState';
import { createHeadlessEditor } from '@lexical/headless';
import { readFile } from 'fs/promises';
import { LexicalEditor, TextNode } from 'lexical';
import { describe } from 'vitest';

let json = '';
let editor: LexicalEditor;
describe('searchLexicalState', () => {
  beforeAll(async () => {
    try {
      json = await readFile(`${__dirname}/../../_data/searchme.json`, 'utf8');
    } catch (e) {
      fail('failed to read test data');
    }
    editor = createHeadlessEditor({
      nodes: lexicalConfig.nodes,
      onError: () => {}
    });
    editor.update(() => {
      editor.setEditorState(editor.parseEditorState(json!));
    });
  });

  function search(
    searchText: string,
    searchOptions?: SearchLexicalStateOptions
  ) {
    const results: {
      node: TextNode;
      startOffset: number;
      endOffset: number;
    }[] = [];
    searchLexicalState(
      editor,
      searchText,
      (node, startOffset, endOffset) => {
        results.push({ node, startOffset, endOffset });
      },
      searchOptions
    );
    return results;
  }

  it('should not work for input too small', () => {
    expect(search('').length).toBe(0);
    expect(search('t').length).toBe(0);
  });

  it('should work for simple text', () => {
    const results = search('Lorem ipsum');
    expect(results.length).toBe(2);
    for (const result of results) {
      expect(result.node.__text).toBe('Lorem ipsum ');
      expect(result.startOffset).toBe(0);
      expect(result.endOffset).toBe(11);
    }
  });

  it('should work for text spanning multiple nodes', () => {
    let results = search('heading');
    expect(results.length).toBe(3);
    expect(results[0].node.__text).toBe('hea');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(3);
    expect(results[1].node.__text).toBe('din');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(3);
    expect(results[2].node.__text).toBe('g 1');
    expect(results[2].startOffset).toBe(0);
    expect(results[2].endOffset).toBe(1);

    results = search('hea');
    expect(results.length).toBe(1);
    expect(results[0].node.__text).toBe('hea');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(3);

    results = search('head');
    expect(results.length).toBe(2);
    expect(results[0].node.__text).toBe('hea');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(3);
    expect(results[1].node.__text).toBe('din');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(1);

    results = search('ding');
    expect(results.length).toBe(2);
    expect(results[0].node.__text).toBe('din');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(3);
    expect(results[1].node.__text).toBe('g 1');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(1);
  });

  it('should be case sensitive by default', () => {
    let results = search('Heading');
    expect(results.length).toBe(0);

    results = search('Heading', { caseInsensitive: true });
    expect(results.length).toBe(3);
  });

  it('should search inside simple text', () => {
    const results = search('consectetur');
    expect(results.length).toBe(2);
    for (const result of results) {
      expect(result.node.__text).toBe(
        ' sit amet, consectetur adipiscing elit,'
      );
      expect(result.startOffset).toBe(11);
      expect(result.endOffset).toBe(22);
    }
  });

  it('should replace paragraph breaks breaks by space when searching', () => {
    // paragraph break
    let results = search('et  dolore');
    expect(results.length).toBe(2);
    expect(results[0].node.__text).toBe('or incididunt ut labore et ');
    expect(results[0].startOffset).toBe(24);
    expect(results[0].endOffset).toBe(27);
    expect(results[1].node.__text).toBe('dolore magna aliqua.');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(6);

    // heading break
    results = search('heading 1 Lorem');
    expect(results.length).toBe(4);
    expect(results[0].node.__text).toBe('hea');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(3);
    expect(results[1].node.__text).toBe('din');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(3);
    expect(results[2].node.__text).toBe('g 1');
    expect(results[2].startOffset).toBe(0);
    expect(results[2].endOffset).toBe(3);
    expect(results[3].node.__text).toBe('Lorem ipsum ');
    expect(results[3].startOffset).toBe(0);
    expect(results[3].endOffset).toBe(5);
  });

  it('should replace linebreaks & block breaks by space when searching', () => {
    const results = search('elit, sed');
    expect(results.length).toBe(4);
    expect(results[0].node.__text).toBe(
      ' sit amet, consectetur adipiscing elit,'
    );
    expect(results[0].startOffset).toBe(34);
    expect(results[0].endOffset).toBe(39);
    expect(results[1].node.__text).toBe('sed do eiusmod tem');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(3);
    expect(results[2].node.__text).toBe(
      ' sit amet, consectetur adipiscing elit,'
    );
    expect(results[2].startOffset).toBe(34);
    expect(results[2].endOffset).toBe(39);
    expect(results[3].node.__text).toBe(
      'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    );
    expect(results[3].startOffset).toBe(0);
    expect(results[3].endOffset).toBe(3);
  });

  it('should search in list items', () => {
    let results = search('list');
    expect(results.length).toBe(1);
    expect(results[0].node.__text).toBe('list');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(4);

    results = search('of');
    expect(results.length).toBe(2);
    expect(results[0].node.__text).toBe('o');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(1);
    expect(results[1].node.__text).toBe('f');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(1);

    results = search('items');
    expect(results.length).toBe(1);
    expect(results[0].node.__text).toBe('items');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(5);

    results = search('item');
    expect(results.length).toBe(1);
    expect(results[0].node.__text).toBe('items');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(4);
  });

  it('should search in list items and replace linebreaks by space', () => {
    let results = search('list of items');
    expect(results.length).toBe(4);
    expect(results[0].node.__text).toBe('list');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(4);
    expect(results[1].node.__text).toBe('o');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(1);
    expect(results[2].node.__text).toBe('f');
    expect(results[2].startOffset).toBe(0);
    expect(results[2].endOffset).toBe(1);
    expect(results[3].node.__text).toBe('items');
    expect(results[3].startOffset).toBe(0);
    expect(results[3].endOffset).toBe(5);

    results = search('list of');
    expect(results.length).toBe(3);
    expect(results[0].node.__text).toBe('list');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(4);
    expect(results[1].node.__text).toBe('o');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(1);
    expect(results[2].node.__text).toBe('f');
    expect(results[2].startOffset).toBe(0);
    expect(results[2].endOffset).toBe(1);

    results = search('of items');
    expect(results.length).toBe(3);
    expect(results[0].node.__text).toBe('o');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(1);
    expect(results[1].node.__text).toBe('f');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(1);
    expect(results[2].node.__text).toBe('items');
    expect(results[2].startOffset).toBe(0);
    expect(results[2].endOffset).toBe(5);

    results = search('list o');
    expect(results.length).toBe(2);
    expect(results[0].node.__text).toBe('list');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(4);
    expect(results[1].node.__text).toBe('o');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(1);

    results = search('f items');
    expect(results.length).toBe(2);
    expect(results[0].node.__text).toBe('f');
    expect(results[0].startOffset).toBe(0);
    expect(results[0].endOffset).toBe(1);
    expect(results[1].node.__text).toBe('items');
    expect(results[1].startOffset).toBe(0);
    expect(results[1].endOffset).toBe(5);
  });
});
