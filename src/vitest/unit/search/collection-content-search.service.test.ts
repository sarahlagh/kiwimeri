import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { lexicalConfig } from '@/common/wysiwyg/lexical/lexical-config';
import storageService from '@/db/storage.service';
import {
  contentSearchService,
  SearchOptions
} from '@/search/collection-content-search.service';
import { searchService } from '@/search/collection-search.service';
import { createHeadlessEditor } from '@lexical/headless';
import { readFile } from 'fs/promises';
import { LexicalEditor, TextNode } from 'lexical';
import { assert, describe } from 'vitest';

const docId = 'iFOR0KVPomZFm4bf';
const docId2 = 'o3LTPA6vAffIZctP';

let jsonCollection = '';
let editor: LexicalEditor;
describe('CollectionContentSearchService', () => {
  beforeAll(async () => {
    try {
      jsonCollection = await readFile(
        `${__dirname}/_data/searchme-collection.json`,
        'utf8'
      );
    } catch (e: any) {
      assert.fail('failed to read test data:' + e.message);
    }
  });
  beforeEach(() => {
    storageService.getSpace().setJson(jsonCollection);
    searchService.initSearchIndices();
  });

  describe('Search Lexical State', () => {
    beforeEach(() => {
      const minimized = storageService
        .getSpace()
        .getCell('collection', docId, 'content')
        ?.toString();
      expect(minimized).toBeDefined();
      expect(
        storageService.getStore().getCell('search', docId, 'contentPreview')
      ).toBeDefined();
      const content = unminimizeContentFromStorage(minimized!);
      editor = createHeadlessEditor({
        nodes: lexicalConfig.nodes,
        onError: () => {}
      });
      const state = editor.parseEditorState(content);
      editor.update(() => {
        editor.setEditorState(state);
      });
    });

    function search(searchText: string, searchOptions?: SearchOptions) {
      const results: {
        node: TextNode;
        startOffset: number;
        endOffset: number;
      }[] = [];
      contentSearchService.searchLexicalState(
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
      expect(results[2].node.__text).toBe('g 1');
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
      expect(results[1].node.__text).toBe('g 1');
      expect(results[1].startOffset).toBe(0);
      expect(results[1].endOffset).toBe(1);
    });

    it('should be case insensitive by default', () => {
      let results = search('Heading');
      expect(results.length).toBe(3);

      results = search('Heading', { caseSensitive: true });
      expect(results.length).toBe(0);
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
      expect(results[2].node.__text).toBe('g 1');
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

    it('should replace non-breaking spaces by normal space', () => {
      const results = search('g 1');
      expect(results.length).toBe(1);
      expect(results[0].node.__text).toBe('g 1');
      expect(results[0].startOffset).toBe(0);
      expect(results[0].endOffset).toBe(3);
    });

    it('should match all occurences within same node', () => {
      const results = search('et');
      expect(results.length).toBe(6);
    });
  });

  describe('Search Document Content', () => {
    function search(searchText: string, searchOptions?: SearchOptions) {
      return contentSearchService.searchDocumentContent(
        docId,
        searchText,
        searchOptions
      );
    }

    it('should not work for input too small', () => {
      expect(search('')).toBe(false);
      expect(search('t')).toBe(false);
    });

    it('should work for simple text', () => {
      expect(search('Lorem ipsum')).toBe(true);
    });

    it('should work for text spanning multiple nodes', () => {
      expect(search('heading')).toBe(true);
      expect(search('hea')).toBe(true);
      expect(search('head')).toBe(true);
      expect(search('ding')).toBe(true);
    });

    it('should be case insensitive by default', () => {
      expect(search('Heading')).toBe(true);
      expect(search('Heading', { caseSensitive: true })).toBe(false);
    });

    it('should search inside simple text', () => {
      expect(search('consectetur')).toBe(true);
    });

    it('should replace paragraph breaks breaks by space when searching', () => {
      // paragraph break
      expect(search('et  dolore')).toBe(true);

      // heading break
      expect(search('heading 1 Lorem')).toBe(true);
    });

    it('should replace linebreaks & block breaks by space when searching', () => {
      expect(search('elit, sed')).toBe(true);
    });

    it('should search in list items', () => {
      expect(search('list')).toBe(true);
      expect(search('of')).toBe(true);
      expect(search('items')).toBe(true);
      expect(search('item')).toBe(true);
    });

    it('should search in list items and replace linebreaks by space', () => {
      expect(search('list of items')).toBe(true);
      expect(search('list of')).toBe(true);
      expect(search('of items')).toBe(true);
      expect(search('list o')).toBe(true);
      expect(search('f items')).toBe(true);
    });

    it('should replace non-breaking spaces by normal space', () => {
      expect(search('g 1')).toBe(true);
    });

    it('should search within pages too', () => {
      // doc with content in its page, not its main body
      const pageText =
        storageService
          .getStore()
          .getCell('search', 'page.id', 'contentPreview')
          ?.toString() || '';
      expect(
        contentSearchService.searchDocumentContent(docId2, 'Lorem ipsum')
      ).toBe(true);
    });
  });

  describe('Search Arbitrary Text', () => {
    const textToSearch =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum';

    function search(searchText: string, searchOptions?: SearchOptions) {
      return contentSearchService
        .searchArbitraryText(textToSearch, searchText, searchOptions)
        .next();
    }

    it('should not work for input too small', () => {
      expect(search('').value).toBe(null);
      expect(search('t').value).toBe(null);
    });

    it('should work for simple text', () => {
      expect(search('Lorem ipsum').value).toEqual({
        startOffset: 0,
        endOffset: 11
      });
    });

    it('should be case insensitive by default', () => {
      expect(search('Dolor').value).toEqual({
        startOffset: 12,
        endOffset: 17
      });
      expect(search('Dolor', { caseSensitive: true }).value).toBe(null);
    });

    it('should iterate on all results within string', () => {
      const nextResult = contentSearchService.searchArbitraryText(
        textToSearch,
        'dolor'
      );

      for (const { startOffset, endOffset } of [
        {
          startOffset: 12,
          endOffset: 17
        },
        {
          startOffset: 103,
          endOffset: 108
        },
        {
          startOffset: 248,
          endOffset: 253
        },
        {
          startOffset: 302,
          endOffset: 307
        }
      ]) {
        const next = nextResult.next();
        expect(next.value).toEqual({
          startOffset,
          endOffset
        });
        expect(next.done).toBeFalsy();
        expect(
          textToSearch.substring(next.value!.startOffset, next.value!.endOffset)
        ).toBe('dolor');
      }

      const next = nextResult.next();
      expect(next.value).toEqual(null);
      expect(next.done).toBeTruthy();
    });
  });

  describe('Deep Search', () => {
    it('should not work for input too small', () => {
      expect(contentSearchService.deepSearch('')).toHaveLength(0);
      expect(contentSearchService.deepSearch('t')).toHaveLength(0);
    });

    it('should match all in content', () => {
      let results = contentSearchService.deepSearch('dolor', {
        searchInContent: true,
        searchInTitle: false
      });
      expect(results).toHaveLength(6);

      results = contentSearchService.deepSearch('dolor sit amet', {
        searchInContent: true,
        searchInTitle: false
      });
      expect(results).toHaveLength(5);

      results = contentSearchService.deepSearch('heading 1', {
        searchInContent: true,
        searchInTitle: false
      });
      expect(results).toHaveLength(2);
    });

    it('should match all in title', () => {
      const results = contentSearchService.deepSearch('mple', {
        searchInContent: false,
        searchInTitle: true
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('-jo5EJjirKTdTisN');
      expect(results[0].firstTitleMatch?.startOffset).toBe(2);
      expect(results[0].firstTitleMatch?.endOffset).toBe(6);
    });
  });
});
