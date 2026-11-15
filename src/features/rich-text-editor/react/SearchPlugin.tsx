import { appConfig } from '@/config';
import { plt } from '@/core/infra/platform';
import { searchLexicalService } from '@/features/search';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalEditor, mergeRegister } from 'lexical';
import { Key, useEffect } from 'react';

type SearchConfig = {
  searchText?: string;
  historyId?: string;
  reloadKey?: Key;
};

export const CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY =
  'kiwimeri-content-search-results';

function isNotSearching(searchText?: string) {
  return !searchText || searchText.length < 2;
}
function doSearch(editor: LexicalEditor, searchText: string) {
  queueMicrotask(() => {
    const ranges: Range[] = [];
    searchLexicalService.searchEditorState(
      editor,
      searchText,
      (textNode, startOffset, endOffset) => {
        const el = editor.getElementByKey(textNode.getKey());
        const hasHighlight = textNode.hasFormat('highlight');
        if (!el) return;
        const child = hasHighlight ? el.firstChild?.firstChild : el.firstChild;
        const range = new Range();
        range.setStart(child!, startOffset);
        range.setEnd(child!, endOffset);
        ranges.push(range);
      }
    );
    const highlight = new Highlight(...ranges);
    CSS.highlights.set(CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY, highlight);
  });
}

export function SearchPlugin({
  searchText,
  historyId,
  reloadKey
}: SearchConfig) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!plt.hasHighlightSupport()) {
      return;
    }
    if (isNotSearching(searchText)) {
      // not searching, return
      CSS.highlights.delete(CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY);
      return;
    }
    doSearch(editor, searchText!);
  }, [editor, searchText]);

  useEffect(() => {
    if (!plt.hasHighlightSupport() || isNotSearching(searchText)) {
      return;
    }
    let lastChange = 0;
    let timeout: NodeJS.Timeout;
    return mergeRegister(
      editor.registerUpdateListener(() => {
        const now = Date.now();
        clearTimeout(timeout);
        if (now - lastChange < appConfig.LEXICAL_SEARCH_DELAY) {
          timeout = setTimeout(() => {
            doSearch(editor, searchText!);
          }, now - lastChange);
        } else {
          doSearch(editor, searchText!);
          lastChange = Date.now();
        }
      }),
      () => {
        clearTimeout(timeout);
      }
    );
  }, [editor, searchText, historyId, reloadKey]);
  return null;
}
