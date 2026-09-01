import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { appConfig } from '@/config';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { schedule } from '@/core/tasks/scheduler.service';
import collectionService, {
  initialContent
} from '@/domain/collection/collection.service';
import { writer } from '@/domain/document-edits/document-edits.service';
import formatConverter from '@/domain/format-conversion/format-converter.service';
import '@/features/collection-notes-ui/components/NotesBrowser.scss';
import {
  DocumentEditor,
  KiwimeriEditor,
  ReloadableKiwimeriEditorHandle
} from '@/features/document-editor';
import { $getRoot } from 'lexical';
import React from 'react';
import { TestingProvider } from '../../TestingProvider';
import {
  getContentEditor,
  getContentEditorElement
} from './KiwimeriEditor.locators';
import { fastWriteScenarios } from './fast-writes.scenarios';

type Props = {
  content?: string;
  enableToolbar?: boolean;
};

const defaults: Required<Props> = {
  content: initialContent(),
  enableToolbar: true
};

function renderEditor(props: Props) {
  return render(
    <KiwimeriEditor {...props} {...defaults} enableDebugTreeView={false} />,
    {
      wrapper: TestingProvider
    }
  );
}

async function renderDocumentEditor(docId: string) {
  const ref = React.createRef<ReloadableKiwimeriEditorHandle>();
  const screen = await render(<DocumentEditor docId={docId} ref={ref} />, {
    wrapper: TestingProvider
  });
  return {
    screen,
    getLexicalEditor() {
      const editor = ref.current?.getEditor();
      if (!editor) {
        throw new Error('Lexical editor not initialized');
      }
      return editor;
    }
  };
}

function compareStates(value: string, expected: any) {
  const valueObj = JSON.parse(value, (key, val) => {
    if (key === 'direction') return 'ltr';
    return val;
  });
  expect(valueObj).toEqual(expected);
}

describe('KiwimeriEditor', () => {
  test('renders an empty editor', async () => {
    const screen = await renderEditor({});
    await expect.element(screen.baseElement).toBeDefined();
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
  });

  test('fill simple paragraph', async () => {
    const screen = await renderEditor({});
    const editor = getContentEditor(screen);
    await editor.fill('test');

    const el = editor.element() as HTMLElement;
    expect(el.children).toHaveLength(1);
    expect(el.children[0].textContent).toBe('test');
  });
});

describe('DocumentEditor', () => {
  test('renders an empty editor', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const { screen } = await renderDocumentEditor(docId);
    await expect.element(screen.baseElement).toBeDefined();
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
  });

  test('fill simple paragraph', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const content = formatConverter.fromMarkdown('test').obj!;
    collectionService.setItemLexicalContent(docId, content);

    const { screen } = await renderDocumentEditor(docId);
    const el = getContentEditorElement(screen);
    expect(el.children).toHaveLength(1);
    expect(el.children[0].textContent).toBe('test');

    await expect.element(screen.baseElement).toBeDefined();
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
  });

  describe('onChange & fastWrite', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      appConfig.SCHEDULER_INTERVAL = 50;
      appConfig.FAST_WRITE_THROTTLE = 100;
      schedule.start();
    });
    afterEach(() => {
      schedule.stop();
      vi.useRealTimers();
    });

    test('change to the editor goes through fastWrite and is not immediately commited', async () => {
      const initialTextContent = 'test';
      const nextTextContent = 'test 2';

      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const content = formatConverter.fromMarkdown(initialTextContent).obj!;
      collectionService.setItemLexicalContent(docId, content);

      const { screen } = await renderDocumentEditor(docId);
      const editor = getContentEditor(screen);
      await editor.fill(nextTextContent);
      const el = editor.element();
      expect(el.children).toHaveLength(1);
      expect(el.children[0].textContent).toBe(nextTextContent);

      expect(JSON.parse(collectionService.getDocumentContent(docId))).toEqual(
        content
      );

      vi.advanceTimersByTime(appConfig.FAST_WRITE_THROTTLE); // flush

      const expected = formatConverter.fromMarkdown(nextTextContent).obj!;
      expect(JSON.parse(collectionService.getDocumentContent(docId))).toEqual(
        expected
      );
    });

    fastWriteScenarios.forEach(
      ({ initial, next, desc, mutate, isFullSnapshot }, idx) => {
        test(`fastWrite scenario #${idx}: ${desc}`, async () => {
          const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
          const content = formatConverter.fromMarkdown(initial).obj!;
          collectionService.setItemLexicalContent(docId, content);

          const { getLexicalEditor } = await renderDocumentEditor(docId);
          const editor = getLexicalEditor();
          const nextContent = formatConverter.fromMarkdown(next).obj!;

          mutate.forEach(m => {
            editor.update(
              () => {
                m($getRoot(), editor);
              },
              { discrete: true }
            );
          });

          compareStates(collectionService.getDocumentContent(docId), content);
          const edits = writer['getEdits']('collection', docId);
          expect(edits).toHaveLength(idx > 0 ? 1 : 0); // first scenario is nothing scenario so, no edits
          if (edits[0]) {
            expect(edits[0].isFullSnapshot).toBe(
              isFullSnapshot !== undefined ? isFullSnapshot : false
            );
          }

          vi.advanceTimersByTime(appConfig.FAST_WRITE_THROTTLE); // flush

          compareStates(
            collectionService.getDocumentContent(docId),
            nextContent
          );
        });
      }
    );
  });
});
