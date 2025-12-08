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
    const results = search('heading');
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
  });

  it('should be case sensitive by default', () => {
    let results = search('Heading');
    expect(results.length).toBe(0);

    results = search('Heading', { caseInsensitive: true });
    expect(results.length).toBe(3);
  });

  it('should search in list items', () => {
    let results = search('of');
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
  });

  // TODO test for joinSingleLines option
});
