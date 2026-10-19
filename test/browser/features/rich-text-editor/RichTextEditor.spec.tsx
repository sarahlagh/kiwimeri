import { describe, expect, test } from 'vitest';

import RichTextEditor from '@/features/document-editor/wysiwyg-editor/lexical-v2/RichTextEditor';
import { getNewContent, getNewParsedContent } from '@@/_setup/test.utils';
import { TestingProvider } from '@@/browser/TestingProvider';
import { useState } from 'react';
import { render } from 'vitest-browser-react';
import {
  getAllToolbarBtns,
  getContentEditor,
  getContentEditorElement,
  getEditorTextContent,
  getToggleReadModeBtn,
  getToolbar
} from './RichTextEditor.locators';
import { renderEditor } from './utils.test';

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
});
