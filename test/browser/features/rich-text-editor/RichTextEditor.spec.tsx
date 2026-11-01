import { describe, expect, test } from 'vitest';

import { OnChangePluginPayload } from '@/features/document-editor/wysiwyg-editor/lexical-v2/react-plugins/OnChangePlugin';
import RichTextEditor from '@/features/document-editor/wysiwyg-editor/lexical-v2/RichTextEditor';
import { RichTextEditorHandle } from '@/features/document-editor/wysiwyg-editor/lexical-v2/RichTextEditorHandle';
import { getNewContent, getNewParsedContent } from '@@/_setup/test.utils';
import { TestingProvider } from '@@/browser/TestingProvider';
import { createRef, RefObject, useState } from 'react';
import { render } from 'vitest-browser-react';
import {
  getAllToolbarBtns,
  getContentEditor,
  getContentEditorElement,
  getEditorTextContent,
  getRedoBtn,
  getToggleReadModeBtn,
  getToolbar,
  getUndoBtn
} from './RichTextEditor.locators';
import { renderEditor } from './utils';

const expectedNumberOfBtns = 22;

const state1 = getNewContent('state 1');
const state2 = getNewContent('state 2');

const parentSwitchBtnId = 'test-btn-initialstate';
const parentToggleEditableBtnId = 'test-btn-editable';
const ParentComponent = ({
  onChange,
  ref
}: {
  onChange?: (payload: OnChangePluginPayload) => void;
  ref?: RefObject<RichTextEditorHandle | null>;
}) => {
  const [initialState, setInitialState] = useState(state1);
  const [editable, setEditable] = useState(true);
  return (
    <div>
      <button
        data-testid={parentSwitchBtnId}
        onClick={() => {
          setInitialState(initialState === state1 ? state2 : state1);
        }}
      >
        state
      </button>
      <button
        data-testid={parentToggleEditableBtnId}
        onClick={() => {
          setEditable(!editable);
        }}
      >
        state
      </button>
      <RichTextEditor
        globalEditable={editable}
        initialState={initialState}
        enableDebugTree={false}
        onChange={onChange}
        historyId={initialState === state1 ? 'state1' : 'state2'}
        ref={ref}
      />
    </div>
  );
};

function filterToolbarBtns(toolbarBtns: (HTMLElement | SVGElement)[]) {
  return toolbarBtns.filter(
    btn => btn.ariaLabel !== 'Undo' && btn.ariaLabel !== 'Redo'
  );
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
      const btn = screen.getByTestId(parentSwitchBtnId);
      await expect.element(btn).toBeInTheDocument();
      await btn.click();

      const textContent2 = await getEditorTextContent(screen);
      expect(textContent2).toBe('state 2');
    });
  });

  describe('is composer editable state', () => {
    test('editable=true propagates to the composer and the toolbar', async () => {
      const screen = await renderEditor({ globalEditable: true, initialState });
      expect(await getEditorTextContent(screen)).toBe('hello world');
      expect(getContentEditorElement(screen)).toHaveAttribute(
        'contenteditable',
        'true'
      );
      await expect.element(getToggleReadModeBtn(screen)).toBeInTheDocument();

      const toolbarBtns = getAllToolbarBtns(screen);
      expect(toolbarBtns).toHaveLength(expectedNumberOfBtns);
      const toolbarBtnFiltered = filterToolbarBtns(toolbarBtns);
      for (const btn of toolbarBtnFiltered) {
        expect(btn).not.toBeDisabled();
      }
    });

    test('editable=false propagates to the composer and the toolbar', async () => {
      const screen = await renderEditor({
        globalEditable: false,
        initialState
      });
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

      const btn = screen.getByTestId(parentToggleEditableBtnId);
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
      const screen = await renderEditor({ globalEditable: true, initialState });
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
      const toolbarBtnFiltered = filterToolbarBtns(toolbarBtns);
      for (const btn of toolbarBtnFiltered) {
        expect(btn).not.toBeDisabled();
      }
    });
  });

  describe('history stack', () => {
    async function renderParent(onChange?: () => void) {
      const ref = createRef<RichTextEditorHandle>();
      const screen = await render(
        <ParentComponent ref={ref} onChange={onChange} />,
        {
          wrapper: TestingProvider
        }
      );
      return {
        ...screen,
        getEditorContext: () => {
          return ref.current?.getEditorContext();
        }
      };
    }

    test('interaction with the editor creates a history entry and onChange event', async () => {
      let onChangeFired = 0;
      const screen = await renderParent(() => {
        onChangeFired++;
      });

      // make some modif
      await getContentEditor(screen).fill('new state 1');
      await getContentEditor(screen).fill('new state 2');

      expect(onChangeFired).toBe(2);
      expect(screen.getEditorContext()).toBeDefined();
      const context = screen.getEditorContext()!;
      expect(context.historyState).toBeDefined();
      expect(context.historyState.redoStack).toHaveLength(0);
      expect(context.historyState.undoStack).toHaveLength(2);
    });

    test('a change of initialState creates a separate history stack and no onChange event', async () => {
      let onChangeFired = 0;
      const screen = await renderParent(() => {
        onChangeFired++;
      });

      // make some modif
      await getContentEditor(screen).fill('new state 1');
      await getContentEditor(screen).fill('new state 2');
      onChangeFired = 0;

      // change to state 2
      const btn = screen.getByTestId(parentSwitchBtnId);
      await expect.element(btn).toBeInTheDocument();
      await btn.click();

      expect(onChangeFired).toBe(0);
      expect(screen.getEditorContext()).toBeDefined();
      const context = screen.getEditorContext()!;
      expect(context.historyState).toBeDefined();
      expect(context.historyState.redoStack).toHaveLength(0);
      expect(context.historyState.undoStack).toHaveLength(0);
    });

    test('can click on undo', async () => {
      let onChangeFired = 0;
      const screen = await renderParent(() => {
        onChangeFired++;
      });

      const undoBtn = getUndoBtn(screen);
      const redoBtn = getRedoBtn(screen);
      await expect(undoBtn).toBeDisabled();
      await expect(redoBtn).toBeDisabled();

      // make some modif
      await getContentEditor(screen).fill('new state 1');
      await getContentEditor(screen).fill('new state 2');
      expect(onChangeFired).toBe(2);

      await expect(undoBtn).not.toBeDisabled();
      await expect(redoBtn).toBeDisabled();

      // undo last
      await undoBtn.click();
      await expect(redoBtn).not.toBeDisabled();
      expect(onChangeFired).toBe(3);

      const textContent = await getEditorTextContent(screen);
      expect(textContent).toBe('new state 1');

      await undoBtn.click();
      await expect(undoBtn).toBeDisabled();
      await expect(redoBtn).not.toBeDisabled();
      expect(onChangeFired).toBe(4);
    });

    test('can click on redo', async () => {
      let onChangeFired = 0;
      const screen = await renderParent(() => {
        onChangeFired++;
      });

      const undoBtn = getUndoBtn(screen);
      const redoBtn = getRedoBtn(screen);
      await expect(undoBtn).toBeDisabled();
      await expect(redoBtn).toBeDisabled();

      // make some modif
      await getContentEditor(screen).fill('new state 1');
      await getContentEditor(screen).fill('new state 2');
      expect(onChangeFired).toBe(2);

      await expect(undoBtn).not.toBeDisabled();
      await expect(redoBtn).toBeDisabled();

      // undo last
      await undoBtn.click();
      await expect(undoBtn).not.toBeDisabled();
      await expect(redoBtn).not.toBeDisabled();
      expect(onChangeFired).toBe(3);

      await redoBtn.click();
      await expect(undoBtn).not.toBeDisabled();
      await expect(redoBtn).toBeDisabled();
      expect(onChangeFired).toBe(4);
    });

    test('cannot click on undo redo if read mode', async () => {
      const screen = await renderParent();

      const undoBtn = getUndoBtn(screen);
      const redoBtn = getRedoBtn(screen);
      // make some modif
      await getContentEditor(screen).fill('new state 1');
      await getContentEditor(screen).fill('new state 2');
      await undoBtn.click();
      await expect(undoBtn).not.toBeDisabled();
      await expect(redoBtn).not.toBeDisabled();

      await getToggleReadModeBtn(screen).click();
      await expect(undoBtn).toBeDisabled();
      await expect(redoBtn).toBeDisabled();

      await getToggleReadModeBtn(screen).click();
      await expect(undoBtn).not.toBeDisabled();
      await expect(redoBtn).not.toBeDisabled();
    });

    test('can switch between documents', async () => {
      let onChangeFired = 0;
      const screen = await renderParent(() => {
        onChangeFired++;
      });

      // make some modif
      await getContentEditor(screen).fill('new state 1');
      await getContentEditor(screen).fill('new state 2');
      await getContentEditor(screen).fill('new state 3');
      await getUndoBtn(screen).click();
      expect(screen.getEditorContext()!.historyState.redoStack).toHaveLength(1);
      expect(screen.getEditorContext()!.historyState.undoStack).toHaveLength(2);
      onChangeFired = 0;

      // change to state 2
      const btn = screen.getByTestId(parentSwitchBtnId);
      await expect.element(btn).toBeInTheDocument();
      await btn.click();

      await getContentEditor(screen).fill('new state a');

      expect(onChangeFired).toBe(1);
      expect(screen.getEditorContext()!.historyState).toBeDefined();
      expect(screen.getEditorContext()!.historyState.redoStack).toHaveLength(0);
      expect(screen.getEditorContext()!.historyState.undoStack).toHaveLength(1);

      onChangeFired = 0;
      await btn.click();
      expect(onChangeFired).toBe(0);
      expect(screen.getEditorContext()!.historyState.redoStack).toHaveLength(1);
      expect(screen.getEditorContext()!.historyState.undoStack).toHaveLength(2);
    });
  });
});
