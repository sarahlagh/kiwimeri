import platformService from '@/common/services/platform.service';
import { contentSearchService } from '@/search/collection-content-search.service';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

type SearchHighlightPluginProps = {
  searchText?: string | null;
};

// note: only enabled if CSS.highlights is supported

const SEARCH_RESULTS = 'kiwimeri-search-results';

export function SearchHighlightPlugin({
  searchText
}: SearchHighlightPluginProps) {
  const [editor] = useLexicalComposerContext();
  if (!platformService.hasHighlightSupport()) {
    return null;
  }
  if (!searchText || searchText.length < 2) {
    // not searching, return
    console.debug('clear highlights');
    CSS.highlights.delete(SEARCH_RESULTS);
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
  CSS.highlights.set(SEARCH_RESULTS, highlight);

  return null;
}
