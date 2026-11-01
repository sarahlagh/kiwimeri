import { plt } from '@/core/infra/platform';
import { searchLexicalService } from '@/features/search';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ReactExtension } from '@lexical/react/ReactExtension';
import { defineExtension } from 'lexical';

type SearchConfig = {
  searchText?: string;
};

export const CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY =
  'kiwimeri-content-search-results';

export function SearchResultWrapper({ searchText }: SearchConfig) {
  const [editor] = useLexicalComposerContext();
  if (!plt.hasHighlightSupport()) {
    return null;
  }
  if (!searchText || searchText.length < 2) {
    // not searching, return
    CSS.highlights.delete(CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY);
    return null;
  }
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
  return null;
}

export const SearchExtension = defineExtension({
  name: '@kiwimeri/rich-text/search',
  namespace: 'react-rich',
  dependencies: [ReactExtension],
  build: () => ({ Component: SearchResultWrapper })
});
