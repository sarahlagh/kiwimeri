import { plt } from '@/core/infra/platform';
import { searchLexicalService } from '@/features/search';
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
