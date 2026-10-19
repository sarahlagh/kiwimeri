import { describe, expect, test } from 'vitest';

import formatConverter from '@/domain/format-conversion/format-converter.service';
import {
  expectLexicalStatesToBeEqual,
  getNewContent
} from '@@/_setup/test.utils';
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
  TextFormatType,
  TextNode
} from 'lexical';
import { Locator } from 'vitest/browser';
import {
  clickOnEditor,
  dismissModal,
  getContentEditor,
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
  getTextFormatBtn
} from './RichTextEditor.locators';
import { renderEditor } from './utils.test';

const initialState = getNewContent('hello world');

describe('RichTextEditor Toolbar', () => {
  // TODO replace by clickOnEditor-like method
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
        // $setSelection(paragraph.select(...offsets));
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
        $setSelection(text.select(2, 2)); // TODO replace by clickOnEditor
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
    await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 2, 2);

        await expect.element(btn).not.toHaveClass('active');

        // select heading again
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 2, 2);
        await expect.element(btn).not.toHaveClass('active');

        // select list again
        await clickOnEditor(screen, 1, 2);
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
      await clickOnEditor(screen, 2, 2);
      await expect.element(btn).not.toHaveClass('active');

      // select quote again
      await clickOnEditor(screen, 1, 2);
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
      await clickOnEditor(screen, 1, 2);
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
        await clickOnEditor(screen, 1, 2);

        const btn = getTextAlignBtn(screen, elementFormat as ElementFormatType);
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
        const btn = getTextAlignBtn(screen, elementFormat as ElementFormatType);
        await expect.element(leftBtn).toBeInTheDocument();
        await expect.element(btn).toBeInTheDocument();
        await btn.click();

        // select second text paragraph
        await clickOnEditor(screen, 2, 2);

        await expect.element(leftBtn).toHaveClass('active');
        await expect.element(btn).not.toHaveClass('active');

        // select first paragraph again
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
          await expect.element(textInput).toHaveValue('hello wo');
          await textInput.fill('helllllowo');

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
              '[helllllowo](https://play.qobuz.com/ "helllllowo")rld'
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
        await clickOnEditor(screen, 1, 2);
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
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
          formatConverter.fromMarkdown('[hello](https://lexical.dev/) world', {
            relAsNoReferrer: false
          }).obj!
        );
      });

      test('caret on existing autolink opens the modal - url change turns the autolink to link', async () => {
        const screen = await renderEditor({
          initialState: initialStateWithAutoLink
        });
        const editor = screen.getLexicalEditor();
        // set caret at text
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
        await clickOnEditor(screen, 1, 2);

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
