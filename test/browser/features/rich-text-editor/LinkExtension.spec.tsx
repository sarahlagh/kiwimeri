import formatConverter from '@/domain/format-conversion/format-converter.service';
import {
  expectLexicalStatesToBeEqual,
  getNewContent
} from '@@/_setup/test.utils';
import {
  $createRangeSelection,
  $getRoot,
  $setSelection,
  ElementNode,
  LexicalEditor,
  TextNode
} from 'lexical';
import { describe, expect, test } from 'vitest';
import {
  dismissModal,
  getContentEditor,
  getLinkBtn,
  getLinkModal,
  getLinkModalTextEditBtn,
  getLinkModalTextInput,
  getLinkModalToggleBtn,
  getLinkModalUrlInput
} from './RichTextEditor.locators';
import { clickOnEditor, renderEditor } from './utils';

const initialState = getNewContent('hello world');

describe('LinkExtension', () => {
  // TODO replace by clickOnEditor-like method
  function selectTextAtParagraph(
    editor: LexicalEditor,
    nthBlock = 0,
    offsets = [0, 3]
  ) {
    editor.update(
      () => {
        const root = $getRoot();
        const paragraph = root.getChildAtIndex(nthBlock) as ElementNode;
        const [start, end] = offsets;
        let i = 0;
        let startNode, endNode, startOffset, endOffset;
        for (const node of paragraph.getAllTextNodes()) {
          const textNode = node as TextNode;
          const textLength = textNode.getTextContent().length;
          i += textLength;
          if (i < start) continue;
          if (!startNode) {
            startNode = node;
            startOffset = start - (i - textLength);
          }
          if (i < end) continue;
          endNode = node;
          endOffset = end - (i - textLength);
          break;
        }
        if (!startNode || !endNode) {
          throw new Error('invalid selection');
        }
        const newSelection = $createRangeSelection();
        newSelection.setTextNodeRange(
          startNode,
          startOffset!,
          endNode,
          endOffset!
        );
        $setSelection(newSelection);
      },
      { discrete: true }
    );
  }

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

    test('selecting around an existing link opens the modal - text change updates the link', async () => {
      const screen = await renderEditor({
        initialState: initialStateWithLink
      });
      const editor = screen.getLexicalEditor();
      selectTextAtParagraph(editor, 0, [0, 8]); // bigger selection than existing link

      // click on link btn
      const linkBtn = getLinkBtn(screen);
      await expect.element(linkBtn).toBeInTheDocument();
      await expect.element(linkBtn).not.toHaveClass('active');
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

      const toggleBtn = getLinkModalToggleBtn(screen);
      await expect.element(toggleBtn).toBeInTheDocument();

      await dismissModal(screen);

      // link has been updated
      expectLexicalStatesToBeEqual(
        JSON.stringify(editor.getEditorState().toJSON()),
        formatConverter.fromMarkdown(
          '[helllllowo](https://lexical.dev/ "helllllowo")rld'
        ).obj!
      );
    });

    test('selecting around an existing link opens the modal - link change updates the link', async () => {
      const screen = await renderEditor({
        initialState: initialStateWithLink
      });
      const editor = screen.getLexicalEditor();
      selectTextAtParagraph(editor, 0, [0, 8]); // bigger selection than existing link

      // click on link btn
      const linkBtn = getLinkBtn(screen);
      await expect.element(linkBtn).toBeInTheDocument();
      await expect.element(linkBtn).not.toHaveClass('active');
      await linkBtn.click();

      // check modal
      await expect.element(getLinkModal(screen)).toBeInTheDocument();

      const textInput = getLinkModalTextInput(screen);
      await expect.element(textInput).toBeInTheDocument();
      await expect.element(textInput).toHaveValue('hello wo');

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
          '[hello wo](https://play.qobuz.com/ "hello wo")rld'
        ).obj!
      );
    });

    test('selecting around an existing link opens the modal - text and link change update the link', async () => {
      const screen = await renderEditor({
        initialState: initialStateWithLink
      });
      const editor = screen.getLexicalEditor();
      selectTextAtParagraph(editor, 0, [0, 8]); // bigger selection than existing link

      // click on link btn
      const linkBtn = getLinkBtn(screen);
      await expect.element(linkBtn).toBeInTheDocument();
      await expect.element(linkBtn).not.toHaveClass('active');
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
    });

    test('selecting partially around an existing link opens the modal - text and link change update the link', async () => {
      const screen = await renderEditor({
        initialState: initialStateWithLink
      });
      const editor = screen.getLexicalEditor();
      selectTextAtParagraph(editor, 0, [3, 8]); // half-selects link

      // click on link btn
      const linkBtn = getLinkBtn(screen);
      await expect.element(linkBtn).toBeInTheDocument();
      await expect.element(linkBtn).toHaveClass('active');
      await linkBtn.click();

      // check modal
      await expect.element(getLinkModal(screen)).toBeInTheDocument();

      const textInput = getLinkModalTextInput(screen);
      await expect.element(textInput).toBeInTheDocument();
      await expect.element(textInput).toHaveValue('lo wo');
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
    });

    test('selecting inside an existing link opens the modal - text and link change update the link', async () => {
      const screen = await renderEditor({
        initialState: initialStateWithLink
      });
      const editor = screen.getLexicalEditor();
      selectTextAtParagraph(editor, 0, [1, 4]); // selects inside link

      // click on link btn
      const linkBtn = getLinkBtn(screen);
      await expect.element(linkBtn).toBeInTheDocument();
      await expect.element(linkBtn).toHaveClass('active');
      await linkBtn.click();

      // check modal
      await expect.element(getLinkModal(screen)).toBeInTheDocument();

      const textInput = getLinkModalTextInput(screen);
      await expect.element(textInput).toBeInTheDocument();
      await expect.element(textInput).toHaveValue('ell'); // should be full link text no?
      await textInput.fill('helllllowo');
      // note: 'ell' is shown but it's the full link node that will be affected, no splitting
      // would need to check whether selection is inside the link node, not bothering for now

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
          '[helllllowo](https://play.qobuz.com/ "helllllowo") world'
        ).obj!
      );
    });

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
      await expect.element(textInput).toBeDisabled();
      await expect.element(textInput).toHaveValue('https://lexical.dev/');

      const urlInput = getLinkModalUrlInput(screen);
      await expect.element(urlInput).toBeInTheDocument();
      await expect.element(urlInput).toHaveValue('https://lexical.dev/');

      const toggleBtn = getLinkModalToggleBtn(screen);
      await expect.element(toggleBtn).toBeInTheDocument();

      const textEditBtn = getLinkModalTextEditBtn(screen);
      await expect.element(textEditBtn).toBeInTheDocument();
    });

    test('caret on existing unlinked autolink opens the modal with text and url filled', async () => {
      const screen = await renderEditor({
        initialState: initialStateWithUnlinkedAutoLink
      });
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
      await expect.element(textInput).toBeDisabled();
      await expect.element(textInput).toHaveValue('https://lexical.dev/');

      const urlInput = getLinkModalUrlInput(screen);
      await expect.element(urlInput).toBeInTheDocument();
      await expect.element(urlInput).toHaveValue('https://lexical.dev/');

      const toggleBtn = getLinkModalToggleBtn(screen);
      await expect.element(toggleBtn).toBeInTheDocument();

      const textEditBtn = getLinkModalTextEditBtn(screen);
      await expect.element(textEditBtn).toBeInTheDocument();
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

    test('caret on existing autolink opens the modal - url change updates the autolink', async () => {
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
        '<https://play.qobuz.com/> world'
      ).obj!;
      expectLexicalStatesToBeEqual(
        JSON.stringify(editor.getEditorState().toJSON()),
        obj
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
      await expect.element(textInput).toBeDisabled();

      const textEditBtn = getLinkModalTextEditBtn(screen);
      await expect.element(textEditBtn).toBeInTheDocument();
      await textEditBtn.click();

      await expect.element(textInput).not.toBeDisabled();
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

    test('caret on existing autolink opens the modal - url and text changes turns the autolink to link', async () => {
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
      await expect.element(textInput).toBeDisabled();

      const textEditBtn = getLinkModalTextEditBtn(screen);
      await expect.element(textEditBtn).toBeInTheDocument();
      await textEditBtn.click();

      await expect.element(textInput).not.toBeDisabled();
      await textInput.fill('hello');

      // change url
      const urlInput = getLinkModalUrlInput(screen);
      await expect.element(urlInput).toBeInTheDocument();
      await urlInput.fill('https://play.qobuz.com/');

      await dismissModal(screen);

      // link has been updated
      expectLexicalStatesToBeEqual(
        JSON.stringify(editor.getEditorState().toJSON()),
        formatConverter.fromMarkdown('[hello](https://play.qobuz.com/) world', {
          relAsNoReferrer: false
        }).obj!
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
    // what if selection is a subpart of an existing antolink
    // what if selection includes an antolink?

    test('selecting an existing autolink opens the modal - link change updates the autolink', async () => {
      const screen = await renderEditor({
        initialState: initialStateWithAutoLink
      });
      const editor = screen.getLexicalEditor();
      selectTextAtParagraph(editor, 0, [0, 20]);

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
      await urlInput.fill('https://play.qobuz.com/');

      const toggleBtn = getLinkModalToggleBtn(screen);
      await expect.element(toggleBtn).toBeInTheDocument();

      await dismissModal(screen);

      // autolink has been updated
      expectLexicalStatesToBeEqual(
        JSON.stringify(editor.getEditorState().toJSON()),
        formatConverter.fromMarkdown('<https://play.qobuz.com/> world').obj!
      );
    });

    test.todo(
      'selecting an existing autolink opens the modal - text change turns the autolink to link',
      async () => {
        const screen = await renderEditor({
          initialState: initialStateWithAutoLink
        });
        const editor = screen.getLexicalEditor();
        selectTextAtParagraph(editor, 0, [0, 20]);

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
      'selecting an existing autolink opens the modal - text and link changes turn the autolink to link',
      async () => {
        const screen = await renderEditor({
          initialState: initialStateWithAutoLink
        });
        const editor = screen.getLexicalEditor();
        selectTextAtParagraph(editor, 0, [0, 20]);

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
      'selecting around an existing autolink opens the modal - text change updates the link',
      async () => {
        const screen = await renderEditor({
          initialState: initialStateWithAutoLink
        });
        const editor = screen.getLexicalEditor();
        selectTextAtParagraph(editor, 0, [0, 8]); // bigger selection than existing link

        // click on link btn
        const linkBtn = getLinkBtn(screen);
        await expect.element(linkBtn).toBeInTheDocument();
        await expect.element(linkBtn).not.toHaveClass('active');
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

        const toggleBtn = getLinkModalToggleBtn(screen);
        await expect.element(toggleBtn).toBeInTheDocument();

        await dismissModal(screen);

        // link has been updated
        expectLexicalStatesToBeEqual(
          JSON.stringify(editor.getEditorState().toJSON()),
          formatConverter.fromMarkdown(
            '[helllllowo](https://lexical.dev/ "helllllowo")rld'
          ).obj!
        );
      }
    );

    test.todo(
      'selecting around an existing autolink opens the modal - link change updates the link',
      async () => {
        const screen = await renderEditor({
          initialState: initialStateWithAutoLink
        });
        const editor = screen.getLexicalEditor();
        selectTextAtParagraph(editor, 0, [0, 8]); // bigger selection than existing link

        // click on link btn
        const linkBtn = getLinkBtn(screen);
        await expect.element(linkBtn).toBeInTheDocument();
        await expect.element(linkBtn).not.toHaveClass('active');
        await linkBtn.click();

        // check modal
        await expect.element(getLinkModal(screen)).toBeInTheDocument();

        const textInput = getLinkModalTextInput(screen);
        await expect.element(textInput).toBeInTheDocument();
        await expect.element(textInput).toHaveValue('hello wo');

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
            '[hello wo](https://play.qobuz.com/ "hello wo")rld'
          ).obj!
        );
      }
    );

    test.todo(
      'selecting around an existing autolink opens the modal - text and link change update the link',
      async () => {
        const screen = await renderEditor({
          initialState: initialStateWithAutoLink
        });
        const editor = screen.getLexicalEditor();
        selectTextAtParagraph(editor, 0, [0, 8]); // bigger selection than existing link

        // click on link btn
        const linkBtn = getLinkBtn(screen);
        await expect.element(linkBtn).toBeInTheDocument();
        await expect.element(linkBtn).not.toHaveClass('active');
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
      'selecting partially around an existing autolink opens the modal - text and link change update the link',
      async () => {
        const screen = await renderEditor({
          initialState: initialStateWithAutoLink
        });
        const editor = screen.getLexicalEditor();
        selectTextAtParagraph(editor, 0, [3, 8]); // half-selects link

        // click on link btn
        const linkBtn = getLinkBtn(screen);
        await expect.element(linkBtn).toBeInTheDocument();
        await expect.element(linkBtn).toHaveClass('active');
        await linkBtn.click();

        // check modal
        await expect.element(getLinkModal(screen)).toBeInTheDocument();

        const textInput = getLinkModalTextInput(screen);
        await expect.element(textInput).toBeInTheDocument();
        await expect.element(textInput).toHaveValue('lo wo');
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
      'selecting inside an existing autolink opens the modal - text and link change update the link',
      async () => {
        const screen = await renderEditor({
          initialState: initialStateWithAutoLink
        });
        const editor = screen.getLexicalEditor();
        selectTextAtParagraph(editor, 0, [1, 4]); // selects inside link

        // click on link btn
        const linkBtn = getLinkBtn(screen);
        await expect.element(linkBtn).toBeInTheDocument();
        await expect.element(linkBtn).toHaveClass('active');
        await linkBtn.click();

        // check modal
        await expect.element(getLinkModal(screen)).toBeInTheDocument();

        const textInput = getLinkModalTextInput(screen);
        await expect.element(textInput).toBeInTheDocument();
        await expect.element(textInput).toHaveValue('ell'); // should be full link text no?
        await textInput.fill('helllllowo');
        // note: 'ell' is shown but it's the full link node that will be affected, no splitting
        // would need to check whether selection is inside the link node, not bothering for now

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
            '[helllllowo](https://play.qobuz.com/ "helllllowo") world'
          ).obj!
        );
      }
    );
  });

  const initialStateWithMultipleLinks = formatConverter.fromMarkdown(
    'autolink1 https://lexical.dev/ autolink2 https://github.com end\n' +
      'link1 [link1](https://lexical.dev/) link1 [link2](https://github.com/) end'
  ).obj!;

  test('selecting multiple links disables the btn', async () => {
    const screen = await renderEditor({
      initialState: initialStateWithMultipleLinks
    });
    const editor = screen.getLexicalEditor();

    const linkBtn = getLinkBtn(screen);
    await expect.element(linkBtn).toBeInTheDocument();
    await expect.element(linkBtn).not.toBeDisabled();

    selectTextAtParagraph(editor, 0, [4, 34]); // 1 autolink
    await expect.element(linkBtn).not.toBeDisabled();

    selectTextAtParagraph(editor, 0, [4, 60]); // multiple autolinks
    await expect.element(linkBtn).toBeDisabled();

    selectTextAtParagraph(editor, 0, [64, 72]); // 1 link
    await expect.element(linkBtn).not.toBeDisabled();

    selectTextAtParagraph(editor, 0, [64, 88]); // multiple links
    await expect.element(linkBtn).toBeDisabled();

    selectTextAtParagraph(editor, 0, [4, 88]); // multiple links
    await expect.element(linkBtn).toBeDisabled();
  });
});
