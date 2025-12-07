import platformService from '@/common/services/platform.service';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, ElementNode } from 'lexical';

type SearchHighlightPluginProps = {
  searchText?: string | null;
};

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
    console.debug('clear highlights');
    CSS.highlights.delete('kiwimeri-search-results');
    return null;
  }

  console.log('search for', searchText);

  editor.read(() => {
    const strLength = searchText.length;
    const regex = new RegExp(searchText, 'g'); // gi for case insensitive - should be an option
    const children = $getRoot().getChildren();
    try {
      const ranges: Range[] = [];
      for (const child of children) {
        if (child instanceof ElementNode) {
          // TODO if text broken by style nodes, this won't find them
          child.getAllTextNodes().forEach(textNode => {
            const text = textNode.getTextContent();
            let result;
            while ((result = regex.exec(text))) {
              const startOffset = result.index;
              const endOffset = startOffset + strLength;
              editor.getElementByKey(textNode.getKey());
              const el = editor.getElementByKey(textNode.getKey());
              if (!el) continue;
              const range = new Range();
              range.setStart(el.firstChild!, startOffset);
              range.setEnd(el.firstChild!, endOffset);
              ranges.push(range);
            }
          });
        }
      }
      if (ranges.length > 0) {
        const highlight = new Highlight(...ranges);
        CSS.highlights.set('kiwimeri-search-results', highlight);
      }
    } catch (e) {
      console.error('Error during search highlight', e);
    }
  });

  return null;
}
