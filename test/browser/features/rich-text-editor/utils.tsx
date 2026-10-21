import RichTextEditor, {
  RichTextEditorProps
} from '@/features/document-editor/wysiwyg-editor/lexical-v2/RichTextEditor';
import { RichTextEditorHandle } from '@/features/document-editor/wysiwyg-editor/lexical-v2/RichTextEditorHandle';
import { TestingProvider } from '@@/browser/TestingProvider';
import { createRef } from 'react';
import { render, RenderResult } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';
import { getContentEditor } from './RichTextEditor.locators';

export async function renderEditor(props: RichTextEditorProps) {
  const ref = createRef<RichTextEditorHandle>();
  const reactNode = (
    <RichTextEditor {...props} enableDebugTree={false} ref={ref} />
  );
  const screen = await render(reactNode, {
    wrapper: TestingProvider
  });
  return {
    ...screen,
    reactNode,
    getLexicalEditor() {
      const editor = ref.current?.getEditor();
      if (!editor) {
        throw new Error('Lexical editor not initialized');
      }
      return editor;
    },
    getEditorContext() {
      const context = ref.current?.getEditorContext();
      if (!context) {
        throw new Error('EditorContext not initialized');
      }
      return context;
    }
  };
}

type Resp = {
  node: ChildNode | null;
  offset: number;
};
function findNodeAtChar(
  element: Element | ChildNode,
  offset: number,
  range?: Resp
): Resp {
  let count = offset;
  if (!range) range = { node: null, offset: 0 };
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent) {
      if (count > child.textContent.length) {
        count -= child.textContent.length;
      } else {
        range.node = child;
        range.offset = count;
        return range;
      }
    } else {
      findNodeAtChar(child, count, range);
      if (range.node) return range;
      if (child.textContent) count -= child.textContent.length;
    }
  }
  return range;
}

function findNodeAtLine(screen: RenderResult, nthLine: number) {
  const rootChildren = getContentEditor(screen).element().children;
  return rootChildren[nthLine - 1];
}

export async function clickOnEditor(
  screen: RenderResult,
  nthLine: number,
  nthChar: number
) {
  const line = findNodeAtLine(screen, nthLine);
  const { node, offset } = findNodeAtChar(line, nthChar);
  if (!node) {
    throw new Error(`could not find node at {${nthLine}, ${nthChar}`);
  }
  const range = document.createRange();
  range.selectNodeContents(line);
  range.setStart(node, 0);
  range.setEnd(node, offset);
  range.collapse(false);
  const rect = range.getBoundingClientRect();
  const position = { x: rect.left + rect.width, y: rect.top + rect.height };

  if (node.parentElement?.parentElement) {
    const style = window.getComputedStyle(
      node.parentElement.parentElement,
      null
    );
    const marginTop = parseInt(
      style.getPropertyValue('margin-top').replace('px', '')
    );
    position.y -= marginTop; // > 0 for listitems

    const isBlockquote = style.getPropertyValue('border-left-width') !== '0px'; // > 0 for blockquotes
    if (isBlockquote) {
      position.y -= 10; // whatever
    }
  }

  await userEvent.click(screen.baseElement, {
    position
  });
}
