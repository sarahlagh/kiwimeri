import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { appConfig } from '@/config';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import collectionService from '@/domain/collection/collection.service';
import formatConverter from '@/domain/format-conversion/format-converter.service';
import '@/features/collection-notes-ui/components/NotesBrowser.scss';
import { DocumentEditor } from '@/features/document-editor';
import { DocumentEditorHandle } from '@/features/document-editor/components/DocumentEditor';
import { amount, getNewParsedContent } from '@@/_setup/test.utils';
import React, { createRef, RefObject, useState } from 'react';
import { TestingProvider } from '../../TestingProvider';
import {
  getContentEditor,
  getEditorElementTextContent,
  getEditorTextContent,
  getRedoBtn,
  getUndoBtn
} from '../rich-text-editor/RichTextEditor.locators';

async function renderDocumentEditor(docId: string) {
  const ref = React.createRef<DocumentEditorHandle>();
  const screen = await render(<DocumentEditor docId={docId} ref={ref} />, {
    wrapper: TestingProvider
  });
  return {
    ...screen,
    getLexicalEditor() {
      if (!ref.current) throw new Error('ref not initialized');
      const editor = ref.current.getEditor();
      if (!editor) {
        throw new Error('Lexical editor not initialized');
      }
      return editor;
    },
    refreshEditor() {
      if (!ref.current) throw new Error('ref not initialized');
      ref.current.refreshContent();
    }
  };
}

const selectDoc1BtnId = 'test-btn-doc1';
const selectDoc2BtnId = 'test-btn-doc2';

const ParentComponent = ({
  ref,
  docIds,
  query
}: {
  ref: RefObject<DocumentEditorHandle | null>;
  docIds: [string, string];
  query?: string;
}) => {
  const [docId, setDocId] = useState(docIds[0]);
  return (
    <div>
      <button
        data-testid={selectDoc1BtnId}
        onClick={() => {
          setDocId(docIds[0]);
        }}
      >
        1
      </button>
      <button
        data-testid={selectDoc2BtnId}
        onClick={() => {
          setDocId(docIds[1]);
        }}
      >
        2
      </button>
      <DocumentEditor docId={docId} query={query} ref={ref} />
    </div>
  );
};

async function renderParent({ docIds }: { docIds: [string, string] }) {
  const ref = createRef<DocumentEditorHandle>();
  const screen = await render(<ParentComponent ref={ref} docIds={docIds} />, {
    wrapper: TestingProvider
  });
  await vi.runAllTimersAsync();
  return {
    ...screen,
    getEditor() {
      if (!ref.current?.getEditor() || !ref.current.getEditor())
        throw new Error('editor not initialized');
      return ref.current.getEditor()!;
    },
    getContext() {
      if (!ref.current?.getContext() || !ref.current.getContext())
        throw new Error('context not initialized');
      return ref.current.getContext()!;
    }
  };
}

describe('DocumentEditor', () => {
  test('renders an empty editor', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const screen = await renderDocumentEditor(docId);
    await expect.element(screen.baseElement).toBeDefined();
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
  });

  test('fill simple paragraph', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const content = formatConverter.fromMarkdown('test').obj!;
    collectionService.setItemLexicalContent(docId, content);

    const screen = await renderDocumentEditor(docId);
    const textContent = await getEditorTextContent(screen);
    expect(textContent).toBe('test');

    await expect.element(screen.baseElement).toBeDefined();
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
  });

  test('refresh editor reloads content', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemLexicalContent(
      docId,
      formatConverter.fromMarkdown('test').obj!
    );

    // rendered
    const screen = await renderDocumentEditor(docId);
    const textContent1 = await getEditorTextContent(screen);
    expect(textContent1).toBe('test');

    // change externally
    collectionService.setItemLexicalContent(
      docId,
      formatConverter.fromMarkdown('test 2').obj!
    );

    screen.refreshEditor();

    await amount(100);

    const textContent2 = await getEditorTextContent(screen);
    expect(textContent2).toBe('test 2');
  });

  describe('search', () => {
    // TODO
    test.todo('can search');
  });

  describe('history stack', () => {
    beforeEach(() => {
      appConfig.LEXICAL_HISTORY_DELAY = 10;
      vi.useFakeTimers({
        toFake: [
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
          'queueMicrotask',
          'Date'
        ]
      });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    test(`can switch between documents and keep history`, async () => {
      const doc1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemLexicalContent(
        doc1,
        getNewParsedContent('state 1')
      );
      const doc2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const screen = await renderParent({
        docIds: [doc1, doc2]
      });
      const composer = getContentEditor(screen);
      const undoBtn = getUndoBtn(screen);

      // make some modif
      await composer.fill('new state 1');
      vi.advanceTimersByTime(100);
      await composer.fill('new state 2');
      vi.advanceTimersByTime(100);
      await composer.fill('new state 3');
      vi.advanceTimersByTime(100);
      await composer.fill('new state 4');
      vi.advanceTimersByTime(100);
      await undoBtn.click();

      expect(getEditorElementTextContent(composer)).toBe('new state 3');
      expect(collectionService.getDocumentPlainText(doc1)).toBe('new state 3');

      {
        const { canRedoLength, canUndoLength } = screen.getContext();
        expect(canRedoLength).toBe(1);
        expect(canUndoLength).toBe(3);
      }

      // change to state 2
      const selectDoc2Btn = screen.getByTestId(selectDoc2BtnId);
      await expect.element(selectDoc2Btn).toBeInTheDocument();
      await selectDoc2Btn.click();
      await vi.runAllTimersAsync();

      {
        const { canRedoLength, canUndoLength } = screen.getContext();
        expect(canRedoLength).toBe(0);
        expect(canUndoLength).toBe(0);
      }
      expect(getEditorElementTextContent(composer)).toBe('');
      await expect.element(undoBtn).toBeDisabled();
      await composer.fill('new state a');
      await expect.element(undoBtn).not.toBeDisabled();
      {
        const { canRedoLength, canUndoLength } = screen.getContext();
        expect(canRedoLength).toBe(0);
        expect(canUndoLength).toBe(1);
      }
      await composer.fill('new state b');
      {
        const { canRedoLength, canUndoLength } = screen.getContext();
        expect(canRedoLength).toBe(0);
        expect(canUndoLength).toBe(2);
      }
      await composer.fill('new state c');
      {
        const { canRedoLength, canUndoLength } = screen.getContext();
        expect(canRedoLength).toBe(0);
        expect(canUndoLength).toBe(3);
      }
      await undoBtn.click();
      {
        const { canRedoLength, canUndoLength } = screen.getContext();
        expect(canRedoLength).toBe(1);
        expect(canUndoLength).toBe(2);
      }
      await undoBtn.click();

      expect(getEditorElementTextContent(composer)).toBe('new state a');
      expect(collectionService.getDocumentPlainText(doc2)).toBe('new state a');

      {
        const { canRedoLength, canUndoLength } = screen.getContext();
        expect(canRedoLength).toBe(2);
        expect(canUndoLength).toBe(1);
      }

      const selectDoc1Btn = screen.getByTestId(selectDoc1BtnId);
      await selectDoc1Btn.click();
      await vi.runAllTimersAsync();

      {
        const { canRedoLength, canUndoLength } = screen.getContext();
        expect(canRedoLength).toBe(1);
        expect(canUndoLength).toBe(3);
      }

      await getRedoBtn(screen).click();
      expect(getEditorElementTextContent(composer)).toBe('new state 4');
      expect(collectionService.getDocumentPlainText(doc1)).toBe('new state 4');
    });
  });
});
