import { describe, expect, test } from 'vitest';

import RichTextEditor, {
  RichTextEditorProps
} from '@/features/document-editor/wysiwyg-editor/lexical-v2/RichTextEditor';
import { RichTextEditorHandle } from '@/features/document-editor/wysiwyg-editor/lexical-v2/RichTextEditorHandle';
import { getNewContent, getNewParsedContent } from '@@/_setup/test.utils';
import { TestingProvider } from '@@/browser/TestingProvider';
import {
  $getRoot,
  $setSelection,
  ElementNode,
  LexicalEditor,
  TextFormatType,
  TextNode
} from 'lexical';
import { createRef } from 'react';
import { render } from 'vitest-browser-react';
import {
  getAllToolbarBtns,
  getContentEditor,
  getContentEditorElement,
  getEditorTextContent,
  getInsertHRBtn,
  getTextFormatBtn,
  getToggleReadModeBtn,
  getToolbar
} from './RichTextEditor.locators';

async function renderEditor(props: RichTextEditorProps) {
  const ref = createRef<RichTextEditorHandle>();
  const screen = await render(
    <RichTextEditor {...props} enableDebugTree={false} ref={ref} />,
    {
      wrapper: TestingProvider
    }
  );
  return {
    ...screen,
    getLexicalEditor() {
      const editor = ref.current?.getEditor();
      if (!editor) {
        throw new Error('Lexical editor not initialized');
      }
      return editor;
    }
  };
}

function reRenderEditor(
  rerender: (ui: React.ReactNode) => Promise<void>,
  props: RichTextEditorProps
) {
  return rerender(<RichTextEditor {...props} />);
}

describe('RichTextEditor', () => {
  const initialState = getNewContent('hello world');

  test('renders an empty editor', async () => {
    const screen = await renderEditor({});
    await expect.element(screen.baseElement).toBeDefined();
    await expect.element(getToolbar(screen)).toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
  });

  test('enableToolbar=false does not render the toolbar', async () => {
    const screen = await renderEditor({ enableToolbar: false });
    await expect.element(screen.baseElement).toBeDefined();
    await expect.element(getToolbar(screen)).not.toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
  });

  describe('initial state', () => {
    test('renders with empty initial state', async () => {
      const screen = await renderEditor({ initialState: '' });
      await expect.element(getContentEditor(screen)).toBeInTheDocument();
    });

    test('renders with string initial state', async () => {
      const stringified = getNewContent('hello world');
      const screen = await renderEditor({ initialState: stringified });
      const textContent = await getEditorTextContent(screen);
      expect(textContent).toBe('hello world');
    });

    test('renders with parsed initial state', async () => {
      const parsed = getNewParsedContent('hello world');
      const screen = await renderEditor({ initialState: parsed });
      const textContent = await getEditorTextContent(screen);
      expect(textContent).toBe('hello world');
    });

    test('a change of initialState triggers a reload', async () => {
      const screen = await renderEditor({
        initialState: getNewContent('state 1')
      });

      const textContent1 = await getEditorTextContent(screen);
      expect(textContent1).toBe('state 1');

      await reRenderEditor(screen.rerender, {
        initialState: getNewContent('state 2')
      });

      const textContent2 = await getEditorTextContent(screen);
      expect(textContent2).toBe('state 2');
    });
  });

  describe('is composer editable state', () => {
    test('editable=true propagates to the composer and the toolbar', async () => {
      const screen = await renderEditor({ editable: true, initialState });
      expect(await getEditorTextContent(screen)).toBe('hello world');
      expect(getContentEditorElement(screen)).toHaveAttribute(
        'contenteditable',
        'true'
      );
      await expect.element(getToggleReadModeBtn(screen)).toBeInTheDocument();

      const toolbarBtns = getAllToolbarBtns(screen);
      expect(toolbarBtns).toHaveLength(10);
      for (const btn of toolbarBtns) {
        expect(btn).not.toBeDisabled();
      }
    });

    test('editable=false propagates to the composer and the toolbar', async () => {
      const screen = await renderEditor({ editable: false, initialState });
      expect(await getEditorTextContent(screen)).toBe('hello world');
      expect(getContentEditorElement(screen)).toHaveAttribute(
        'contenteditable',
        'false'
      );
      await expect
        .element(getToggleReadModeBtn(screen))
        .not.toBeInTheDocument();

      const toolbarBtns = getAllToolbarBtns(screen);
      expect(toolbarBtns).toHaveLength(9);
      for (const btn of toolbarBtns) {
        expect(btn).toBeDisabled();
      }
    });

    test('toggle read btn propagates to the composer and the toolbar', async () => {
      const screen = await renderEditor({ editable: true, initialState });
      expect(await getEditorTextContent(screen)).toBe('hello world');
      expect(getContentEditorElement(screen)).toHaveAttribute(
        'contenteditable',
        'true'
      );
      const toggleBtn = getToggleReadModeBtn(screen);
      await expect.element(toggleBtn).not.toHaveClass('active');
      await expect.element(toggleBtn).toBeInTheDocument();

      await toggleBtn.click();
      await expect.element(toggleBtn).toBeInTheDocument();
      await expect.element(toggleBtn).toHaveClass('active');

      expect(getContentEditorElement(screen)).toHaveAttribute(
        'contenteditable',
        'false'
      );
      const toolbarBtns = getAllToolbarBtns(screen);
      expect(toolbarBtns).toHaveLength(10);
      for (const btn of toolbarBtns) {
        if (btn.ariaLabel === 'Read Mode') continue;
        expect(btn).toBeDisabled();
      }

      await toggleBtn.click();
      await expect.element(toggleBtn).not.toHaveClass('active');
      expect(getContentEditorElement(screen)).toHaveAttribute(
        'contenteditable',
        'true'
      );
      for (const btn of toolbarBtns) {
        expect(btn).not.toBeDisabled();
      }
    });
  });

  describe('toolbar', () => {
    describe('text format toolbar buttons', () => {
      function selectAndSetTextFormat(
        editor: LexicalEditor,
        format: TextFormatType
      ) {
        editor.update(
          () => {
            const root = $getRoot();
            const paragraph = root.getFirstChildOrThrow() as ElementNode;
            const text = paragraph.getFirstChildOrThrow() as TextNode;
            $setSelection(text.select(2));
          },
          { discrete: true }
        );
        editor.update(
          () => {
            const root = $getRoot();
            const paragraph = root.getFirstChildOrThrow() as ElementNode;
            const text = paragraph.getFirstChildOrThrow() as TextNode;
            text.setFormat(format);
          },
          { discrete: true }
        );
      }

      function hasTextFormat(editor: LexicalEditor, type: TextFormatType) {
        return editor.read(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChildOrThrow() as ElementNode;
          const text = paragraph.getFirstChildOrThrow() as TextNode;
          return text.hasFormat(type);
        });
      }

      const supportedFormats: TextFormatType[] = [
        'bold',
        'underline',
        'strikethrough',
        'italic',
        'highlight'
      ];

      supportedFormats.forEach(type => {
        test(`${type} text format under selection propagates to the toolbar`, async () => {
          const screen = await renderEditor({ initialState });
          expect(await getEditorTextContent(screen)).toBe('hello world');
          const btn = getTextFormatBtn(screen, type);
          await expect.element(btn).not.toHaveClass('active');

          const editor = screen.getLexicalEditor();
          selectAndSetTextFormat(editor, type);

          await expect.element(btn).toHaveClass('active');
        });

        test(`${type} btn propagates format to selection`, async () => {
          const screen = await renderEditor({ initialState });
          expect(await getEditorTextContent(screen)).toBe('hello world');
          const editor = screen.getLexicalEditor();

          editor.update(
            () => {
              const root = $getRoot();
              const paragraph = root.getFirstChildOrThrow() as ElementNode;
              const text = paragraph.getFirstChildOrThrow() as TextNode;
              $setSelection(text.select(0, 4));
            },
            { discrete: true }
          );

          const btn = getTextFormatBtn(screen, type);
          await expect.element(btn).not.toHaveClass('active');

          await btn.click();

          await expect.element(btn).toHaveClass('active');
          expect(hasTextFormat(editor, type)).toBe(true);
        });
      });

      test(`multiple text formats under selection propagate to the toolbar`, async () => {
        const screen = await renderEditor({ initialState });
        expect(await getEditorTextContent(screen)).toBe('hello world');
        const boldBtn = getTextFormatBtn(screen, 'bold');
        const italicBtn = getTextFormatBtn(screen, 'italic');
        const underlineBtn = getTextFormatBtn(screen, 'underline');
        await expect.element(boldBtn).not.toHaveClass('active');
        await expect.element(italicBtn).not.toHaveClass('active');
        await expect.element(underlineBtn).not.toHaveClass('active');

        const editor = screen.getLexicalEditor();
        editor.update(
          () => {
            const root = $getRoot();
            const paragraph = root.getFirstChildOrThrow() as ElementNode;
            const text = paragraph.getFirstChildOrThrow() as TextNode;
            text.toggleFormat('bold');
            text.toggleFormat('underline');
          },
          { discrete: true }
        );
        editor.update(
          () => {
            const root = $getRoot();
            const paragraph = root.getFirstChildOrThrow() as ElementNode;
            const text = paragraph.getFirstChildOrThrow() as TextNode;
            $setSelection(text.select(2));
          },
          { discrete: true }
        );

        await expect.element(boldBtn).toHaveClass('active');
        await expect.element(italicBtn).not.toHaveClass('active');
        await expect.element(underlineBtn).toHaveClass('active');
      });

      test(`format btn toggle format to selection`, async () => {
        const screen = await renderEditor({ initialState });
        expect(await getEditorTextContent(screen)).toBe('hello world');
        const editor = screen.getLexicalEditor();

        editor.update(
          () => {
            const root = $getRoot();
            const paragraph = root.getFirstChildOrThrow() as ElementNode;
            const text = paragraph.getFirstChildOrThrow() as TextNode;
            $setSelection(text.select(0, 4));
          },
          { discrete: true }
        );

        const boldBtn = getTextFormatBtn(screen, 'bold');
        const italicBtn = getTextFormatBtn(screen, 'italic');
        const underlineBtn = getTextFormatBtn(screen, 'underline');
        await expect.element(boldBtn).not.toHaveClass('active');
        await expect.element(italicBtn).not.toHaveClass('active');
        await expect.element(underlineBtn).not.toHaveClass('active');

        await boldBtn.click();
        await underlineBtn.click();

        await expect.element(boldBtn).toHaveClass('active');
        expect(hasTextFormat(editor, 'bold')).toBe(true);

        await expect.element(italicBtn).not.toHaveClass('active');
        expect(hasTextFormat(editor, 'italic')).toBe(false);

        await expect.element(underlineBtn).toHaveClass('active');
        expect(hasTextFormat(editor, 'underline')).toBe(true);
      });
    });

    test('horizontal rule btn inserts it under selected paragraph', async () => {
      const screen = await renderEditor({ initialState });
      expect(await getEditorTextContent(screen)).toBe('hello world');
      const editor = screen.getLexicalEditor();

      // select
      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = root.getFirstChildOrThrow() as ElementNode;
          const text = paragraph.getFirstChildOrThrow() as TextNode;
          $setSelection(text.select(0, 4));
        },
        { discrete: true }
      );

      const btn = getInsertHRBtn(screen);
      await expect.element(btn).toBeInTheDocument();
      await btn.click();

      expect(
        editor.read(() => {
          const root = $getRoot();
          const hr = root.getChildAtIndex(1);
          return hr?.getType();
        })
      ).toBe('horizontalrule');
    });
  });

  // TODO test heading toolbar state?
});
