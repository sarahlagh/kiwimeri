import { describe, expect, test } from 'vitest';

import formatConverter from '@/domain/format-conversion/format-converter.service';
import RichTextEditor, {
  RichTextEditorProps
} from '@/features/document-editor/wysiwyg-editor/lexical-v2/RichTextEditor';
import { RichTextEditorHandle } from '@/features/document-editor/wysiwyg-editor/lexical-v2/RichTextEditorHandle';
import {
  expectLexicalStatesToBeEqual,
  getNewContent,
  getNewParsedContent
} from '@@/_setup/test.utils';
import { TestingProvider } from '@@/browser/TestingProvider';
import { ListNode, ListType } from '@lexical/list';
import { HeadingNode, HeadingTagType } from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  ElementFormatType,
  ElementNode,
  LexicalEditor,
  PointType,
  TextFormatType,
  TextNode
} from 'lexical';
import { createRef, useState } from 'react';
import { render } from 'vitest-browser-react';
import { Locator } from 'vitest/browser';
import {
  clickOnEditor,
  dismissModal,
  getAllToolbarBtns,
  getContentEditor,
  getContentEditorElement,
  getEditorTextContent,
  getHeadingBtn,
  getInsertHRBtn,
  getLinkBtn,
  getLinkModal,
  getLinkModalTextInput,
  getLinkModalToggleBtn,
  getLinkModalUrlInput,
  getListBtn,
  getQuoteBtn,
  getTextAlignBtn,
  getTextFormatBtn,
  getToggleReadModeBtn,
  getToolbar
} from './RichTextEditor.locators';

const expectedNumberOfBtns = 19;

const state1 = getNewContent('state 1');
const state2 = getNewContent('state 2');
const ParentComponent = () => {
  const [initialState, setInitialState] = useState(state1);
  const [editable, setEditable] = useState(true);
  return (
    <div>
      <button
        data-testid="test-btn-initialstate"
        onClick={() => {
          setInitialState(initialState === state1 ? state2 : state1);
        }}
      >
        state
      </button>
      <button
        data-testid="test-btn-editable"
        onClick={() => {
          setEditable(!editable);
        }}
      >
        state
      </button>
      <RichTextEditor
        editable={editable}
        initialState={initialState}
        enableDebugTree={false}
      />
    </div>
  );
};

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
      const screen = await render(<ParentComponent />, {
        wrapper: TestingProvider
      });

      const textContent1 = await getEditorTextContent(screen);
      expect(textContent1).toBe('state 1');

      // change to state 2
      const btn = screen.getByTestId('test-btn-initialstate');
      await expect.element(btn).toBeInTheDocument();
      await btn.click();

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
      expect(toolbarBtns).toHaveLength(expectedNumberOfBtns);
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
      expect(toolbarBtns).toHaveLength(expectedNumberOfBtns - 1);
      for (const btn of toolbarBtns) {
        expect(btn).toBeDisabled();
      }
    });

    test('a change of editable triggers a reload', async () => {
      const screen = await render(<ParentComponent />, {
        wrapper: TestingProvider
      });

      expect(getContentEditorElement(screen)).toHaveAttribute(
        'contenteditable',
        'true'
      );

      const btn = screen.getByTestId('test-btn-editable');
      await expect.element(btn).toBeInTheDocument();
      await btn.click();

      expect(getContentEditorElement(screen)).toHaveAttribute(
        'contenteditable',
        'false'
      );
      await expect
        .element(getToggleReadModeBtn(screen))
        .not.toBeInTheDocument();
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
      expect(toolbarBtns).toHaveLength(expectedNumberOfBtns);
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
    function putCaretAtParagraph(
      editor: LexicalEditor,
      index = 0,
      textNodeIdx = 0,
      offset = 2
    ) {
      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = root.getChildAtIndex(index) as ElementNode;
          const text = paragraph.getAllTextNodes()[textNodeIdx] as TextNode;
          $setSelection(text.select(offset, offset));
        },
        { discrete: true }
      );
    }
    function selectTextAtParagraph(
      editor: LexicalEditor,
      index = 0,
      offsets = [0, 3]
    ) {
      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = root.getChildAtIndex(index) as ElementNode;
          const text = paragraph.getAllTextNodes()[0] as TextNode;
          $setSelection(text.select(...offsets));
        },
        { discrete: true }
      );
    }
    function createSecondParagraphAndSetCaretAtFirst(editor: LexicalEditor) {
      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = root.getFirstChildOrThrow() as ElementNode;
          const text = paragraph.getFirstChildOrThrow() as TextNode;
          const secondParagraph = $createParagraphNode();
          secondParagraph.append($createTextNode('text'));
          root.append(secondParagraph);
          $setSelection(text.select(2, 2));
        },
        { discrete: true }
      );
    }
    function getBlockType(editor: LexicalEditor, index = 0) {
      return editor.read(() => {
        const root = $getRoot();
        const block = root.getChildAtIndex(index);
        return block?.getType();
      });
    }

    test('selection change updates the toolbar', async () => {
      const screen = await renderEditor({
        initialState: formatConverter.fromMarkdown(
          'hello **world** with <u>formats</u>\n\n' +
            '# heading\n\n' +
            '[hello](https://lexical.dev/ "hello") world with links\n\n' +
            '<p style="text-align: center;">center text</p>'
        ).obj!
      });
      const editor = screen.getLexicalEditor();

      const caretPositions: {
        line: number;
        offset: number;
        expected: { offset: number; activeButton: Locator };
      }[] = [
        {
          line: 1,
          offset: 7,
          expected: {
            offset: 1,
            activeButton: getTextFormatBtn(screen, 'bold')
          }
        },
        {
          line: 1,
          offset: 20,
          expected: {
            offset: 3,
            activeButton: getTextFormatBtn(screen, 'underline')
          }
        },
        {
          line: 2,
          offset: 4,
          expected: {
            offset: 4,
            activeButton: getHeadingBtn(screen, 'h1')
          }
        },
        {
          line: 3,
          offset: 3,
          expected: { offset: 3, activeButton: getLinkBtn(screen) }
        },
        {
          line: 4,
          offset: 5,
          expected: {
            offset: 5,
            activeButton: getTextAlignBtn(screen, 'center')
          }
        }
      ];

      let previousBtn: Locator | null = null;
      for (const caret of caretPositions) {
        await clickOnEditor(screen, caret.line, caret.offset);
        // check selection
        const selection = editor.read(() => $getSelection());
        expect($isRangeSelection(selection)).toBe(true);
        const points = selection!.getStartEndPoints()!;
        expect(points[0].is(points[1])).toBe(true);
        expect(points[0].offset).toBe(caret.expected.offset);

        await expect.element(caret.expected.activeButton).toHaveClass('active');

        if (previousBtn !== null) {
          // eslint-disable-next-line vitest/no-conditional-expect
          await expect.element(previousBtn).not.toHaveClass('active');
        }

        previousBtn = caret.expected.activeButton;
      }
    });

    describe('text format buttons', () => {
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

        test(`${type} btn propagates format to node at selection even if no range`, async () => {
          const screen = await renderEditor({ initialState });
          expect(await getEditorTextContent(screen)).toBe('hello world');
          const editor = screen.getLexicalEditor();

          editor.update(
            () => {
              const root = $getRoot();
              const paragraph = root.getFirstChildOrThrow() as ElementNode;
              const text = paragraph.getFirstChildOrThrow() as TextNode;
              $setSelection(text.select(4, 4));
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
      putCaretAtParagraph(editor);

      const btn = getInsertHRBtn(screen);
      await expect.element(btn).toBeInTheDocument();
      await btn.click();

      expect(getBlockType(editor, 1)).toBe('horizontalrule');
    });

    describe('block heading buttons', () => {
      ['h1', 'h2', 'h3'].forEach(tag => {
        test(`${tag} heading btn on paragraph creates heading block`, async () => {
          const screen = await renderEditor({ initialState });
          const editor = screen.getLexicalEditor();

          // set caret at text
          putCaretAtParagraph(editor);

          const btn = getHeadingBtn(screen, tag as HeadingTagType);
          await expect.element(btn).toBeInTheDocument();
          await expect.element(btn).not.toHaveClass('active');

          await btn.click();

          expect(getBlockType(editor)).toBe('heading');

          expect(
            editor.read(() => {
              const root = $getRoot();
              const block = root.getChildAtIndex(0);
              return (block as HeadingNode)?.getTag();
            })
          ).toBe(tag);

          await expect.element(btn).toHaveClass('active');
        });

        test(`${tag} heading block under selection propagates to the toolbar`, async () => {
          const screen = await renderEditor({ initialState });
          const editor = screen.getLexicalEditor();
          // set caret at text
          createSecondParagraphAndSetCaretAtFirst(editor);
          const btn = getHeadingBtn(screen, tag as HeadingTagType);
          await expect.element(btn).toBeInTheDocument();
          await btn.click();

          // select second text paragraph
          putCaretAtParagraph(editor, 1);

          await expect.element(btn).not.toHaveClass('active');

          // select heading again
          putCaretAtParagraph(editor, 0);

          await expect.element(btn).toHaveClass('active');
        });
      });
    });

    describe('block list buttons', () => {
      ['bullet', 'number', 'check'].forEach(listType => {
        test(`${listType} list btn on paragraph creates list block`, async () => {
          const screen = await renderEditor({ initialState });
          const editor = screen.getLexicalEditor();

          // set caret at text
          createSecondParagraphAndSetCaretAtFirst(editor);

          const btn = getListBtn(screen, listType as ListType);
          await expect.element(btn).toBeInTheDocument();
          await expect.element(btn).not.toHaveClass('active');

          await btn.click();

          expect(getBlockType(editor)).toBe('list');

          expect(
            editor.read(() => {
              const root = $getRoot();
              const block = root.getChildAtIndex(0);
              return (block as ListNode)?.getListType();
            })
          ).toBe(listType);

          await expect.element(btn).toHaveClass('active');
        });

        test(`${listType} list block under selection propagates to the toolbar`, async () => {
          const screen = await renderEditor({ initialState });
          const editor = screen.getLexicalEditor();

          createSecondParagraphAndSetCaretAtFirst(editor);

          const btn = getListBtn(screen, listType as ListType);
          await expect.element(btn).toBeInTheDocument();
          await btn.click();

          // select second text paragraph
          putCaretAtParagraph(editor, 1);
          await expect.element(btn).not.toHaveClass('active');

          // select list again
          putCaretAtParagraph(editor, 0);
          await expect.element(btn).toHaveClass('active');
        });
      });
    });

    describe('quote button', () => {
      test(`quote btn on paragraph creates quote block`, async () => {
        const screen = await renderEditor({ initialState });
        const editor = screen.getLexicalEditor();

        // set caret at text
        createSecondParagraphAndSetCaretAtFirst(editor);

        const btn = getQuoteBtn(screen);
        await expect.element(btn).toBeInTheDocument();
        await expect.element(btn).not.toHaveClass('active');

        await btn.click();

        expect(getBlockType(editor)).toBe('quote');

        await expect.element(btn).toHaveClass('active');
      });

      test(`quote block under selection propagates to the toolbar`, async () => {
        const screen = await renderEditor({ initialState });
        const editor = screen.getLexicalEditor();

        createSecondParagraphAndSetCaretAtFirst(editor);

        const btn = getQuoteBtn(screen);
        await expect.element(btn).toBeInTheDocument();
        await btn.click();

        // select second text paragraph
        putCaretAtParagraph(editor, 1);
        await expect.element(btn).not.toHaveClass('active');

        // select quote again
        putCaretAtParagraph(editor, 0);
        await expect.element(btn).toHaveClass('active');
      });
    });

    describe('text align buttons', () => {
      function getBlockFormatType(editor: LexicalEditor, index = 0) {
        return editor.read(() => {
          const root = $getRoot();
          const block = root.getChildAtIndex(index);
          return (block as ElementNode).getFormatType();
        });
      }

      test(`left text-align btn on paragraph adds text-align`, async () => {
        const screen = await renderEditor({ initialState });
        const editor = screen.getLexicalEditor();

        // set caret at text
        putCaretAtParagraph(editor);
        const rightBtn = getTextAlignBtn(screen, 'right');
        await expect.element(rightBtn).toBeInTheDocument();
        await rightBtn.click();

        const btn = getTextAlignBtn(screen, 'left');
        await expect.element(btn).toBeInTheDocument();
        await expect.element(btn).not.toHaveClass('active');

        await btn.click();

        expect(getBlockFormatType(editor)).toBe('left');

        await expect.element(btn).toHaveClass('active');
      });

      ['right', 'center', 'justify'].forEach(elementFormat => {
        test(`${elementFormat} text-align btn on paragraph adds text-align`, async () => {
          const screen = await renderEditor({ initialState });
          const editor = screen.getLexicalEditor();

          // set caret at text
          putCaretAtParagraph(editor);

          const btn = getTextAlignBtn(
            screen,
            elementFormat as ElementFormatType
          );
          await expect.element(btn).toBeInTheDocument();
          await expect.element(btn).not.toHaveClass('active');

          await btn.click();

          expect(getBlockFormatType(editor)).toBe(elementFormat);

          await expect.element(btn).toHaveClass('active');
        });

        test(`${elementFormat} heading block under selection propagates to the toolbar`, async () => {
          const screen = await renderEditor({ initialState });
          const editor = screen.getLexicalEditor();
          // set caret at text
          createSecondParagraphAndSetCaretAtFirst(editor);
          const leftBtn = getTextAlignBtn(screen, 'left');
          const btn = getTextAlignBtn(
            screen,
            elementFormat as ElementFormatType
          );
          await expect.element(leftBtn).toBeInTheDocument();
          await expect.element(btn).toBeInTheDocument();
          await btn.click();

          // select second text paragraph
          putCaretAtParagraph(editor, 1);

          await expect.element(leftBtn).toHaveClass('active');
          await expect.element(btn).not.toHaveClass('active');

          // select first paragraph again
          putCaretAtParagraph(editor, 0);

          await expect.element(leftBtn).not.toHaveClass('active');
          await expect.element(btn).toHaveClass('active');
        });
      });
    });

    describe('links and autolinks', () => {
      describe('links', () => {
        test('link btn on selected non link text opens the link modal', async () => {
          const screen = await renderEditor({ initialState });
          const editor = screen.getLexicalEditor();
          // set caret at text
          selectTextAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await expect.element(linkBtn).not.toHaveClass('active');
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          const textInput = getLinkModalTextInput(screen);
          await expect.element(textInput).toBeInTheDocument();
          await expect.element(textInput).toHaveValue('hel');

          const urlInput = getLinkModalUrlInput(screen);
          await expect.element(urlInput).toBeInTheDocument();
          await expect.element(urlInput).toHaveValue('');

          const toggleBtn = getLinkModalToggleBtn(screen);
          await expect.element(toggleBtn).not.toBeInTheDocument();
        });

        test('link btn on selected non link text opens the link modal - nothing happens if closed without change', async () => {
          const screen = await renderEditor({ initialState });
          const editor = screen.getLexicalEditor();
          // set caret at text
          selectTextAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await expect.element(linkBtn).not.toHaveClass('active');
          await linkBtn.click();

          // dismiss modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();
          await dismissModal(screen);

          await expect.element(getLinkModal(screen)).not.toBeInTheDocument();

          // nothing changed
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            JSON.parse(initialState)
          );
        });

        test('link btn on selected non link text opens the link modal - text change without a url does nothing', async () => {
          const screen = await renderEditor({ initialState });
          const editor = screen.getLexicalEditor();
          // set caret at text
          selectTextAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await expect.element(linkBtn).not.toHaveClass('active');
          await linkBtn.click();

          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // change text
          const textInput = getLinkModalTextInput(screen);
          await expect.element(textInput).toBeInTheDocument();
          await textInput.fill('helllll');

          await dismissModal(screen);

          // nothing has changed
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            JSON.parse(initialState)
          );
        });

        test('link btn on selected non link text opens the link modal - url change creates the link', async () => {
          const screen = await renderEditor({ initialState });
          const editor = screen.getLexicalEditor();
          // set caret at text
          selectTextAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await expect.element(linkBtn).not.toHaveClass('active');
          await linkBtn.click();

          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // change url
          const urlInput = getLinkModalUrlInput(screen);
          await expect.element(urlInput).toBeInTheDocument();
          await urlInput.fill('https://lexical.dev/');

          await dismissModal(screen);

          // link has been created
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown(
              '[hel](https://lexical.dev/ "hel")lo world'
            ).obj!
          );
        });

        test('link btn on selected non link text opens the link modal - url and text changes create the link', async () => {
          const screen = await renderEditor({ initialState });
          const editor = screen.getLexicalEditor();
          // set caret at text
          selectTextAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await expect.element(linkBtn).not.toHaveClass('active');
          await linkBtn.click();

          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // change text
          const textInput = getLinkModalTextInput(screen);
          await expect.element(textInput).toBeInTheDocument();
          await textInput.fill('hellll');

          // change url
          const urlInput = getLinkModalUrlInput(screen);
          await expect.element(urlInput).toBeInTheDocument();
          await urlInput.fill('https://lexical.dev/');

          await dismissModal(screen);

          // link has been created
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown(
              '[hellll](https://lexical.dev/ "hellll")lo world'
            ).obj!
          );
        });

        const initialStateWithLink = formatConverter.fromMarkdown(
          '[hello](https://lexical.dev/ "hello") world'
        ).obj!;

        test('caret on existing link opens the modal with text and url filled', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await expect.element(linkBtn).toHaveClass('active');
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          const textInput = getLinkModalTextInput(screen);
          await expect.element(textInput).toBeInTheDocument();
          await expect.element(textInput).toHaveValue('hello');

          const urlInput = getLinkModalUrlInput(screen);
          await expect.element(urlInput).toBeInTheDocument();
          await expect.element(urlInput).toHaveValue('https://lexical.dev/');

          const toggleBtn = getLinkModalToggleBtn(screen);
          await expect.element(toggleBtn).toBeInTheDocument();
        });

        test('caret on existing link opens the modal - nothing happens if closed without change', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();
          await dismissModal(screen);

          await expect.element(getLinkModal(screen)).not.toBeInTheDocument();

          // nothing changed
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            initialStateWithLink
          );
        });

        test('caret on existing link opens the modal - text change updates the link', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // change text
          const textInput = getLinkModalTextInput(screen);
          await expect.element(textInput).toBeInTheDocument();
          await textInput.fill('helllllo');

          await dismissModal(screen);

          // link has been updated
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown(
              '[helllllo](https://lexical.dev/ "helllllo") world'
            ).obj!
          );
        });

        test('caret on existing link opens the modal - url change updates the link', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // change url
          const urlInput = getLinkModalUrlInput(screen);
          await expect.element(urlInput).toBeInTheDocument();
          await urlInput.fill('https://play.qobuz.com/');

          await dismissModal(screen);

          // link has been updated
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown(
              '[hello](https://play.qobuz.com/ "hello") world'
            ).obj!
          );
        });

        test('caret on existing link opens the modal - url and text changes update the link', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // change text
          const textInput = getLinkModalTextInput(screen);
          await expect.element(textInput).toBeInTheDocument();
          await textInput.fill('helllllo');

          // change url
          const urlInput = getLinkModalUrlInput(screen);
          await expect.element(urlInput).toBeInTheDocument();
          await urlInput.fill('https://play.qobuz.com/');

          await dismissModal(screen);

          // link has been updated
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown(
              '[helllllo](https://play.qobuz.com/ "helllllo") world'
            ).obj!
          );
        });

        test('caret on existing link opens the modal - clear button deletes the link', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // click clear button
          const btn = getLinkModalToggleBtn(screen);
          await expect.element(btn).toBeInTheDocument();
          await btn.click();

          await expect.element(getLinkModal(screen)).not.toBeInTheDocument();

          // link has been deleted
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown('hello world').obj!
          );
        });

        // TODO selection on link does the same thing...
        // what if selection is a subpart of a an existing link
        // what if selection includes a link? bug here

        test('selecting an existing link opens the modal - text and link change update the link', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithLink
          });
          const editor = screen.getLexicalEditor();
          selectTextAtParagraph(editor, 0, [0, 5]);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await expect.element(linkBtn).toHaveClass('active');
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          const textInput = getLinkModalTextInput(screen);
          await expect.element(textInput).toBeInTheDocument();
          await expect.element(textInput).toHaveValue('hello');
          await textInput.fill('helllllo');

          const urlInput = getLinkModalUrlInput(screen);
          await expect.element(urlInput).toBeInTheDocument();
          await expect.element(urlInput).toHaveValue('https://lexical.dev/');
          await urlInput.fill('https://play.qobuz.com/');

          const toggleBtn = getLinkModalToggleBtn(screen);
          await expect.element(toggleBtn).toBeInTheDocument();

          await dismissModal(screen);

          // link has been updated
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown(
              '[helllllo](https://play.qobuz.com/ "helllllo") world'
            ).obj!
          );
        });

        test.todo(
          'selecting around an existing link opens the modal - text and link change update the link',
          async () => {
            const screen = await renderEditor({
              initialState: initialStateWithLink
            });
            const editor = screen.getLexicalEditor();
            selectTextAtParagraph(editor, 0, [0, 8]); // bigger selection than existing link

            // click on link btn
            const linkBtn = getLinkBtn(screen);
            await expect.element(linkBtn).toBeInTheDocument();
            await expect.element(linkBtn).toHaveClass('active');
            await linkBtn.click();

            // check modal
            await expect.element(getLinkModal(screen)).toBeInTheDocument();

            const textInput = getLinkModalTextInput(screen);
            await expect.element(textInput).toBeInTheDocument();
            await expect.element(textInput).toHaveValue('hello');
            await textInput.fill('helllllo');

            const urlInput = getLinkModalUrlInput(screen);
            await expect.element(urlInput).toBeInTheDocument();
            await expect.element(urlInput).toHaveValue('https://lexical.dev/');
            await urlInput.fill('https://play.qobuz.com/');

            const toggleBtn = getLinkModalToggleBtn(screen);
            await expect.element(toggleBtn).toBeInTheDocument();

            await dismissModal(screen);

            // link has been updated
            expectLexicalStatesToBeEqual(
              JSON.stringify(editor.getEditorState().toJSON()),
              formatConverter.fromMarkdown(
                '[helllllo](https://play.qobuz.com/ "helllllo") world'
              ).obj!
            );
          }
        );

        test.todo(
          'selecting inside an existing link opens the modal - text and link change update the link',
          async () => {}
        );

        test.todo(
          'link btn on non link caret opens the link modal with the word under cursor',
          async () => {}
        );
      });

      describe('autolinks', () => {
        test('autolink is automatically created on paste', async () => {
          const screen = await renderEditor({ initialState });
          const textbox = getContentEditor(screen);
          const editor = screen.getLexicalEditor();

          await expect.element(textbox).toBeInTheDocument();
          await textbox.fill('https://lexical.dev/');

          // autolink has been created
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown('<https://lexical.dev/>').obj!
          );

          // set caret at text
          putCaretAtParagraph(editor);
          await expect.element(getLinkBtn(screen)).toHaveClass('active');
        });

        const initialStateWithAutoLink = formatConverter.fromMarkdown(
          '<https://lexical.dev/> world'
        ).obj!;

        const initialStateWithUnlinkedAutoLink = formatConverter.fromMarkdown(
          'https://lexical.dev/ world'
        ).obj!;

        test('caret on existing autolink opens the modal with text and url filled', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithAutoLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await expect.element(linkBtn).toHaveClass('active');
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          const textInput = getLinkModalTextInput(screen);
          await expect.element(textInput).toBeInTheDocument();
          await expect.element(textInput).toHaveValue('https://lexical.dev/');

          const urlInput = getLinkModalUrlInput(screen);
          await expect.element(urlInput).toBeInTheDocument();
          await expect.element(urlInput).toHaveValue('https://lexical.dev/');

          const toggleBtn = getLinkModalToggleBtn(screen);
          await expect.element(toggleBtn).toBeInTheDocument();
        });

        test('caret on existing unlinked autolink opens the modal with text and url filled', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithUnlinkedAutoLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await expect.element(linkBtn).toHaveClass('active');
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          const textInput = getLinkModalTextInput(screen);
          await expect.element(textInput).toBeInTheDocument();
          await expect.element(textInput).toHaveValue('https://lexical.dev/');

          const urlInput = getLinkModalUrlInput(screen);
          await expect.element(urlInput).toBeInTheDocument();
          await expect.element(urlInput).toHaveValue('https://lexical.dev/');

          const toggleBtn = getLinkModalToggleBtn(screen);
          await expect.element(toggleBtn).toBeInTheDocument();
        });

        test('caret on existing autolink opens the link modal - nothing happens if closed without change', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithAutoLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();
          await dismissModal(screen);

          await expect.element(getLinkModal(screen)).not.toBeInTheDocument();

          // nothing changed
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            initialStateWithAutoLink
          );
        });

        test('caret on existing autolink opens the modal - text change turns the autolink to link', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithAutoLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // change text
          const textInput = getLinkModalTextInput(screen);
          await expect.element(textInput).toBeInTheDocument();
          await textInput.fill('hello');

          await dismissModal(screen);

          // link has been updated
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown(
              '[hello](https://lexical.dev/) world',
              { relAsNoReferrer: false }
            ).obj!
          );
        });

        test('caret on existing autolink opens the modal - url change turns the autolink to link', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithAutoLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // change url
          const urlInput = getLinkModalUrlInput(screen);
          await expect.element(urlInput).toBeInTheDocument();
          await urlInput.fill('https://play.qobuz.com/');

          await dismissModal(screen);

          // link has been updated
          const obj = formatConverter.fromMarkdown(
            '[https://lexical.dev/](https://play.qobuz.com/) world',
            { relAsNoReferrer: false }
          ).obj!;
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            obj
          );
        });

        test('caret on existing autolink opens the modal - url and text changes update the link', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithAutoLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // change text
          const textInput = getLinkModalTextInput(screen);
          await expect.element(textInput).toBeInTheDocument();
          await textInput.fill('hello');

          // change url
          const urlInput = getLinkModalUrlInput(screen);
          await expect.element(urlInput).toBeInTheDocument();
          await urlInput.fill('https://play.qobuz.com/');

          await dismissModal(screen);

          // link has been updated
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown(
              '[hello](https://play.qobuz.com/) world',
              { relAsNoReferrer: false }
            ).obj!
          );
        });

        test('caret on existing autolink opens the modal - clear button unlinks the autolink', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithAutoLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // click clear button
          const btn = getLinkModalToggleBtn(screen);
          await expect.element(btn).toBeInTheDocument();
          await btn.click();

          await expect.element(getLinkModal(screen)).not.toBeInTheDocument();

          // link has been unlinked
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown('https://lexical.dev/ world').obj!
          );

          // still counts as a link
          await expect.element(linkBtn).toHaveClass('active');
        });

        test('caret on unlinked autolink opens the modal - clear button relinks it', async () => {
          const screen = await renderEditor({
            initialState: initialStateWithUnlinkedAutoLink
          });
          const editor = screen.getLexicalEditor();
          // set caret at text
          putCaretAtParagraph(editor);

          // click on link btn
          const linkBtn = getLinkBtn(screen);
          await expect.element(linkBtn).toBeInTheDocument();
          await linkBtn.click();

          // check modal
          await expect.element(getLinkModal(screen)).toBeInTheDocument();

          // click clear button
          const btn = getLinkModalToggleBtn(screen);
          await expect.element(btn).toBeInTheDocument();
          await btn.click();

          await expect.element(getLinkModal(screen)).not.toBeInTheDocument();

          // autolink has been linked
          expectLexicalStatesToBeEqual(
            JSON.stringify(editor.getEditorState().toJSON()),
            formatConverter.fromMarkdown('<https://lexical.dev/> world').obj!
          );

          // still counts as a link
          await expect.element(linkBtn).toHaveClass('active');
        });

        // TODO selection on antolink does the same thing...
        // what if selection is a subpart of a an existing antolink
        // what if selection includes an antolink?
      });
    });
  });
});

// only test the clickOnEditor method
describe('clickOnEditor', () => {
  const initialState = formatConverter.fromMarkdown(
    'hello **world** with <u>formats</u>\n\n' +
      '# heading\n\n' +
      '[hello](https://lexical.dev/ "hello") world with links https://github.com\n\n' +
      '<p style="text-align: center;">Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?</p>\n\n' +
      '- with a list\n' +
      '- of *course*'
  ).obj!;

  type Scenario = {
    skip?: boolean;
    desc: string;
    line: number;
    offset: number;
    expected: {
      offset: number;
      textContent?: string;
      wordUnderCursor?: string;
    };
  };
  const scenarios: Scenario[] = [
    {
      desc: 'w in first line',
      line: 1,
      offset: 7,
      expected: { offset: 1, textContent: 'world' }
    },
    {
      desc: 'r in first line',
      line: 1,
      offset: 20,
      expected: { offset: 3, textContent: 'formats' }
    },
    {
      desc: 'd in second line (heading)',
      line: 2,
      offset: 4,
      expected: { offset: 4, textContent: 'heading' }
    },
    {
      desc: 'l in third line (link)',
      line: 3,
      offset: 3,
      expected: { offset: 3, textContent: 'hello' }
    },
    {
      desc: 's in third line (link)',
      line: 3,
      offset: 22,
      expected: {
        offset: 17,
        textContent: ' world with links '
      }
    },
    {
      desc: 't in third line (link)',
      line: 3,
      offset: 26,
      expected: {
        offset: 3,
        textContent: 'https://github.com'
      }
    },
    {
      desc: 'somewhere in fourth line (centered)',
      line: 4,
      offset: 583,
      expected: {
        offset: 583,
        wordUnderCursor: 'minima '
      }
    },
    {
      desc: 'somewhere else in fourth line (centered)',
      line: 4,
      offset: 784,
      expected: {
        offset: 784,
        wordUnderCursor: 'molestiae '
      }
    },
    {
      desc: 'on first list item',
      line: 5,
      offset: 6,
      expected: {
        offset: 6,
        textContent: 'with a list'
      }
    },
    {
      desc: 'on second list item',
      line: 5,
      offset: 17,
      expected: {
        offset: 3,
        textContent: 'course'
      }
    }
  ];

  const debugScenarios: Omit<Scenario, 'expected'>[] = [
    ...scenarios,
    {
      desc: 'on second list item',
      line: 5,
      offset: 17
    }
  ];

  function getWordUnderCursor(point: PointType) {
    const textContent = point.getNode().getTextContent();
    const whitespaceBefore =
      textContent.substring(0, point.offset).lastIndexOf(' ') + 1;
    let whitespaceAfter = textContent.substring(point.offset).indexOf(' ') + 1;
    if (whitespaceAfter === 0) whitespaceAfter = textContent.length - 1;
    const wordUnderCursor = textContent.substring(
      whitespaceBefore,
      point.offset + whitespaceAfter
    );
    return wordUnderCursor;
  }

  scenarios.forEach(({ desc, line, offset: char, expected, skip }) => {
    if (skip === true) return;
    test(`${desc}`, async () => {
      const screen = await renderEditor({
        initialState
      });
      const editor = screen.getLexicalEditor();

      await clickOnEditor(screen, line, char);
      editor.read(() => {
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        const points = selection!.getStartEndPoints()!;
        expect(points[0].is(points[1])).toBe(true);
        expect(points[0].offset).toBe(expected.offset);
        if (expected.textContent) {
          // eslint-disable-next-line vitest/no-conditional-expect
          expect(points[0].getNode().getTextContent()).toBe(
            expected.textContent
          );
        }
        if (expected.wordUnderCursor) {
          // eslint-disable-next-line vitest/no-conditional-expect
          expect(getWordUnderCursor(points[0])).toBe(expected.wordUnderCursor);
        }
      });
    });
  });

  const { line, offset: char } = debugScenarios[scenarios.length + 0];
  // eslint-disable-next-line vitest/no-disabled-tests
  test.skip(`debug scenario`, async () => {
    const screen = await renderEditor({
      initialState
    });
    const editor = screen.getLexicalEditor();

    await clickOnEditor(screen, line, char);
    getContentEditorElement(screen).addEventListener('click', event => {
      console.debug('clicked', event.clientX, event.clientY);
      editor.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const points = selection.getStartEndPoints();
          console.debug('point', points[0].offset);
          const wordUnderCursor = getWordUnderCursor(points[0]);
          console.debug('word under cursor', `'${wordUnderCursor}'`);
        }
      });
    });

    // always false to give time to click
    await expect
      .element(getToggleReadModeBtn(screen), { timeout: 10000000000 })
      .toHaveClass('active');
  });
  // });
});
