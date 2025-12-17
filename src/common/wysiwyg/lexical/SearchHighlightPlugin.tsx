import platformService from '@/common/services/platform.service';
import { contentSearchService } from '@/search/collection-content-search.service';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

type SearchHighlightPluginProps = {
  searchText?: string | null;
};

const CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY = 'kiwimeri-content-search-results';

// note: only enabled if CSS.highlights is supported

export function SearchHighlightPlugin({
  searchText
}: SearchHighlightPluginProps) {
  const [editor] = useLexicalComposerContext();
  if (!platformService.hasHighlightSupport()) {
    return null;
  }
  if (!searchText || searchText.length < 2) {
    // not searching, return
    CSS.highlights.delete(CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY);
    return null;
  }

  const ranges: Range[] = [];
  contentSearchService.searchLexicalState(
    editor,
    searchText,
    (textNode, startOffset, endOffset) => {
      editor.getElementByKey(textNode.getKey());
      const el = editor.getElementByKey(textNode.getKey());
      if (!el) return;
      const range = new Range();
      range.setStart(el.firstChild!, startOffset);
      range.setEnd(el.firstChild!, endOffset);
      ranges.push(range);
    }
  );
  const highlight = new Highlight(...ranges);
  CSS.highlights.set(CONTENT_SEARCH_RESULTS_HIGHLIGHT_KEY, highlight);

  return null;
}
