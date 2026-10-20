import { describe, expect, test } from 'vitest';

import formatConverter from '@/domain/format-conversion/format-converter.service';
import {
  expectLexicalStatesToBeEqual,
  getNewContent
} from '@@/_setup/test.utils';
import { ListNode, ListType } from '@lexical/list';
import { HeadingNode, HeadingTagType, QuoteNode } from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createRangeSelection,
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
  getEditorTextContent,
  getHeadingBtn,
  getInsertHRBtn,
  getLinkBtn,
  getListBtn,
  getQuoteBtn,
  getRemoveFormatBtn,
  getTextAlignBtn,
  getTextFormatBtn
} from './RichTextEditor.locators';
import { clickOnEditor, renderEditor } from './utils';

const initialState = getNewContent('hello world');

describe('RichTextEditor Toolbar', () => {
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

  test('remove format button clears', async () => {
    const screen = await renderEditor({
      initialState: formatConverter.fromMarkdown(
        'hello **world** with <u>formats</u>\n\n' +
          '# heading\n\n' +
          '[hel*lo*](https://lexical.dev/ "hello") world with links https://github.com\n\n' +
          '<p style="text-align: center;">Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?</p>\n\n' +
          '- with a list\n' +
          '- of *course*\n\n' +
          '> and a quote\n' +
          '> second ~~row~~'
      ).obj!
    });

    // select all except last ~~row~~
    const editor = screen.getLexicalEditor();
    editor.update(
      () => {
        const root = $getRoot();
        const firstBlock = root.getFirstChildOrThrow() as ElementNode;
        const textNode1 = firstBlock.getFirstChildOrThrow() as TextNode;
        const lastBlock = root.getLastChildOrThrow() as QuoteNode;
        const textNode2 = lastBlock.getFirstChildOrThrow() as TextNode;
        const selection = $createRangeSelection();
        selection.setTextNodeRange(textNode1, 2, textNode2, 2);
        $setSelection(selection);
      },
      { discrete: true }
    );

    const btn = getRemoveFormatBtn(screen);
    await expect.element(btn).toBeInTheDocument();
    await btn.click();

    expectLexicalStatesToBeEqual(
      JSON.stringify(editor.getEditorState().toJSON()),
      formatConverter.fromMarkdown(
        'hello world with formats\n\n' +
          'heading\n\n' +
          '[hello](https://lexical.dev/ "hello") world with links https://github.com\n\n' +
          'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?\n\n' +
          'with a list\n\n' +
          'of course\n\n' +
          'and a quote\n\n' +
          'second ~~row~~'
      ).obj!
    );
  });
});
