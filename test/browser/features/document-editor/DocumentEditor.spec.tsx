import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import collectionService from '@/domain/collection/collection.service';
import formatConverter from '@/domain/format-conversion/format-converter.service';
import '@/features/collection-notes-ui/components/NotesBrowser.scss';
import { DocumentEditor } from '@/features/document-editor';
import { DocumentEditorHandle } from '@/features/document-editor/components/DocumentEditor';
import { amount } from '@@/_setup/test.utils';
import React from 'react';
import { TestingProvider } from '../../TestingProvider';
import {
  getContentEditor,
  getEditorTextContent
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
});
