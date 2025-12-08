import platformService from '@/common/services/platform.service';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { searchLexicalState } from './searchLexicalState';

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

  console.log('search for', searchText);

  const ranges: Range[] = [];
  searchLexicalState(editor, searchText, (textNode, startOffset, endOffset) => {
    editor.getElementByKey(textNode.getKey());
    const el = editor.getElementByKey(textNode.getKey());
    if (!el) return;
    const range = new Range();
    range.setStart(el.firstChild!, startOffset);
    range.setEnd(el.firstChild!, endOffset);
    ranges.push(range);
  });
  const highlight = new Highlight(...ranges);
  CSS.highlights.set(SEARCH_RESULTS, highlight);

  return null;
}
