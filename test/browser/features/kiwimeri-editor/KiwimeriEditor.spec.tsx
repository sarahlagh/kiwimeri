import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import fetchNotificationsQuery from '@/app/queries/fetchNotificationsQuery';
import { appConfig } from '@/config';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import collectionService, {
  initialContent
} from '@/domain/collection/collection.service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { writer } from '@/domain/document-edits/document-edits.service';
import formatConverter from '@/domain/format-conversion/format-converter.service';
import { ActionsFromDocumentEditorToolbar } from '@/features/collection-item-actions';
import '@/features/collection-notes-ui/components/NotesBrowser.scss';
import {
  DocumentEditor,
  KiwimeriEditor,
  ReloadableKiwimeriEditorHandle
} from '@/features/document-editor';
import { compareLexicalStates } from '@@/_setup/test.utils';
import { $createTextNode, $getRoot, ElementNode } from 'lexical';
import React from 'react';
import { TestingProvider } from '../../TestingProvider';
import {
  getContentEditor,
  getContentEditorElement
} from './KiwimeriEditor.locators';
import { fastWriteScenarios } from './fast-writes.scenarios';

/// setup mocks
vi.mock('@/domain/document-edits/document-edits.service', { spy: true });
let spyOnWriteContent = vi.spyOn(writer, 'writeContent');

/// test suite

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

  describe('fastWrite modes', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      appConfig.SCHEDULER_INTERVAL = 50;
      appConfig.FAST_WRITE_THROTTLE = 100;
      schedule.start();
      spyOnWriteContent = vi.spyOn(writer, 'writeContent');
    });
    afterEach(() => {
      deviceSettings.set('enableFastWrite', false);
      deviceSettings.clear('fastWriteMode');
      schedule.stop();
      vi.useRealTimers();
    });

    test('fastWrite disabled => each mutation is commited', async () => {
      deviceSettings.set('enableFastWrite', false);
      deviceSettings.set('fastWriteMode', 'run');

      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const { getLexicalEditor } = await renderDocumentEditor(docId);
      const editor = getLexicalEditor();
      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = root.getChildAtIndex(0) as ElementNode;
          paragraph?.append($createTextNode('line 1'));
          root.append(paragraph);
        },
        { discrete: true }
      );

      const content = formatConverter.fromMarkdown('line 1').obj!;
      compareLexicalStates(
        collectionService.getDocumentContent(docId),
        content
      );
      const edits = writer['getEdits']('collection', docId);
      expect(edits).toHaveLength(0);
      expect(
        schedule['getTasks'](true).filter(t => t.name === TaskNames.FAST_WRITE)
      ).toHaveLength(0);

      expect(spyOnWriteContent).not.toHaveBeenCalled();
    });

    test('fastWrite enabled in watch mode => each mutation is commited but edits are on', async () => {
      deviceSettings.set('enableFastWrite', true);
      deviceSettings.set('fastWriteMode', 'watch');

      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const { getLexicalEditor } = await renderDocumentEditor(docId);
      const editor = getLexicalEditor();
      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = root.getChildAtIndex(0) as ElementNode;
          paragraph?.append($createTextNode('line 1'));
          root.append(paragraph);
        },
        { discrete: true }
      );

      const content = formatConverter.fromMarkdown('line 1').obj!;
      compareLexicalStates(
        collectionService.getDocumentContent(docId),
        content
      );
      const edits = writer['getEdits']('collection', docId);
      expect(edits).toHaveLength(1);
      expect(edits[0].debugPayload).toBeDefined();
      expect(
        schedule['getTasks'](true).filter(t => t.name === TaskNames.FAST_WRITE)
      ).toHaveLength(1);

      expect(spyOnWriteContent).not.toHaveBeenCalled();
    });

    test('fastWrite enabled in watch mode => reconciliation clears on OK', async () => {
      deviceSettings.set('enableFastWrite', true);
      deviceSettings.set('fastWriteMode', 'watch');

      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const { getLexicalEditor } = await renderDocumentEditor(docId);
      const editor = getLexicalEditor();
      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = root.getChildAtIndex(0) as ElementNode;
          paragraph?.append($createTextNode('line 1'));
          root.append(paragraph);
        },
        { discrete: true }
      );

      vi.advanceTimersByTime(200);

      expect(spyOnWriteContent).not.toHaveBeenCalled();
      expect(fetchNotificationsQuery.getResults({ all: true })).toHaveLength(0);

      const content = formatConverter.fromMarkdown('line 1').obj!;
      compareLexicalStates(
        collectionService.getDocumentContent(docId),
        content
      );
      const edits = writer['getEdits']('collection', docId);
      expect(edits).toHaveLength(0);
      expect(
        schedule['getTasks'](true).filter(t => t.name === TaskNames.FAST_WRITE)
      ).toHaveLength(0);
    });

    test('fastWrite enabled in watch mode => reconciliation does not clear and sends notif on KO', async () => {
      deviceSettings.set('enableFastWrite', true);
      deviceSettings.set('fastWriteMode', 'watch');

      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const { getLexicalEditor } = await renderDocumentEditor(docId);
      const editor = getLexicalEditor();
      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = root.getChildAtIndex(0) as ElementNode;
          paragraph?.append($createTextNode('line 1'));
          root.append(paragraph);
        },
        { discrete: true }
      );

      // tamper with edit for the test
      const tamperedJson =
        '[{"block":{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"tampered line","type":"text","version":1}],"direction":null,"format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""},"idx":0}]';
      space.setCell(
        SpaceTables.DocumentEdits,
        writer['getEdits']('collection', docId)[0].id,
        'json',
        tamperedJson
      );

      vi.advanceTimersByTime(200);

      expect(spyOnWriteContent).not.toHaveBeenCalled();
      expect(fetchNotificationsQuery.getResults({ all: true })).toHaveLength(1);

      // content is still ok
      const content = formatConverter.fromMarkdown('line 1').obj!;
      compareLexicalStates(
        collectionService.getDocumentContent(docId),
        content
      );

      // edits have not been cleared
      const edits = writer['getEdits']('collection', docId);
      expect(edits).toHaveLength(1);

      // but no task left
      expect(
        schedule['getTasks'](true).filter(t => t.name === TaskNames.FAST_WRITE)
      ).toHaveLength(0);
    });

    test('fastWrite enabled in run mode => only edits are on and reconciliation writes content', async () => {
      deviceSettings.set('enableFastWrite', true);
      deviceSettings.set('fastWriteMode', 'run');

      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const { getLexicalEditor } = await renderDocumentEditor(docId);
      const editor = getLexicalEditor();
      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = root.getChildAtIndex(0) as ElementNode;
          paragraph?.append($createTextNode('line 1'));
          root.append(paragraph);
        },
        { discrete: true }
      );

      expect(collectionService.getDocumentContent(docId)).toEqual(
        initialContent()
      );
      const edits = writer['getEdits']('collection', docId);
      expect(edits).toHaveLength(1);
      expect(edits[0].debugPayload).toBeUndefined();

      expect(
        schedule['getTasks'](true).filter(t => t.name === TaskNames.FAST_WRITE)
      ).toHaveLength(1);
      expect(spyOnWriteContent).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200);

      expect(spyOnWriteContent).toHaveBeenCalledTimes(1);
      expect(fetchNotificationsQuery.getResults({ all: true })).toHaveLength(0);

      const content = formatConverter.fromMarkdown('line 1').obj!;
      compareLexicalStates(
        collectionService.getDocumentContent(docId),
        content
      );
      expect(writer['getEdits']('collection', docId)).toHaveLength(0);

      expect(
        schedule['getTasks'](true).filter(t => t.name === TaskNames.FAST_WRITE)
      ).toHaveLength(0);
    });
  });

  describe('onChange & fastWrite enabled in run mode', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      deviceSettings.set('enableFastWrite', true);
      deviceSettings.set('fastWriteMode', 'run');
      appConfig.SCHEDULER_INTERVAL = 50;
      appConfig.FAST_WRITE_THROTTLE = 100;
      schedule.start();
    });
    afterEach(() => {
      deviceSettings.set('enableFastWrite', false);
      deviceSettings.clear('fastWriteMode');
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
                m($getRoot());
              },
              { discrete: true }
            );
          });

          compareLexicalStates(
            collectionService.getDocumentContent(docId),
            content
          );
          const edits = writer['getEdits']('collection', docId);
          expect(edits).toHaveLength(idx > 0 ? mutate.length : 0); // first scenario is nothing scenario so, no edits

          edits.forEach((edit, idx) => {
            expect(edit.isFullSnapshot).toBe(
              isFullSnapshot !== undefined ? isFullSnapshot === idx : false
            );
          });

          vi.advanceTimersByTime(appConfig.FAST_WRITE_THROTTLE); // flush

          compareLexicalStates(
            collectionService.getDocumentContent(docId),
            nextContent
          );
        });
      }
    );
  });

  describe('fast write debug button visibility in actions', () => {
    test('fast write debug button is visible if fast write enabled and in watch mode', async () => {
      deviceSettings.set('enableFastWrite', true);
      deviceSettings.set('fastWriteMode', 'watch');
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const screen = await render(
        <ActionsFromDocumentEditorToolbar
          docId={docId}
          onClose={() => {}}
          onSearch={() => {}}
        />,
        {
          wrapper: TestingProvider
        }
      );
      await expect
        .element(screen.getByRole('button', { name: 'Fast Write Debug Btn' }))
        .toBeVisible();
    });

    test('fast write debug button is not visible if fast write enabled and in run mode', async () => {
      deviceSettings.set('enableFastWrite', true);
      deviceSettings.set('fastWriteMode', 'run');
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const screen = await render(
        <ActionsFromDocumentEditorToolbar
          docId={docId}
          onClose={() => {}}
          onSearch={() => {}}
        />,
        {
          wrapper: TestingProvider
        }
      );
      await expect
        .element(screen.getByRole('button', { name: 'Fast Write Debug Btn' }))
        .not.toBeInTheDocument();
    });

    test('fast write debug button is not visible if fast write not enabled', async () => {
      deviceSettings.set('enableFastWrite', false);
      deviceSettings.set('fastWriteMode', 'watch');
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const screen = await render(
        <ActionsFromDocumentEditorToolbar
          docId={docId}
          onClose={() => {}}
          onSearch={() => {}}
        />,
        {
          wrapper: TestingProvider
        }
      );
      await expect
        .element(screen.getByRole('button', { name: 'Fast Write Debug Btn' }))
        .not.toBeInTheDocument();
    });
  });
});

// TODO test NoteEditor
