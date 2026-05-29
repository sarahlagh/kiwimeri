import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import collectionService from '@/db/collection.service';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import { resumeService } from '@/domain/resume-state/resume-state.service';
import { NotesBrowser } from '@/features/notes-ui';
import fetchNotesQuery from '@/features/notes-ui/queries/fetchNotesQuery';
import { getNewContent } from '@@/_setup/test.utils';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  getAddBtn,
  getContentEditor,
  getCreateANoteNote,
  getCreatedAtNoteInfo,
  getDeleteNoteBtn,
  getNotePreview,
  getSelectANoteNote,
  getSortFilterBtn,
  getSortSwitchDirectionBtn,
  getSwitchNoteInfoBtn,
  getToggleActionsBtn,
  getUpdatedAtNoteInfo
} from './NotesBrowser.locators';

import '@/features/notes-ui/components/NotesBrowser.scss';
import BottomSheet from '@/shared/containers/BottomSheet';
import { TestingProvider } from '../../TestingProvider';

describe('NotesBrowser', () => {
  test('renders an empty notes browser', async () => {
    const screen = await render(<NotesBrowser id="0" />, {
      wrapper: TestingProvider
    });
    await expect.element(getSelectANoteNote(screen)).toBeInTheDocument();
    await expect.element(getCreateANoteNote(screen)).toBeInTheDocument();
    await expect.element(getAddBtn(screen)).toBeInTheDocument();
    await expect.element(getSortFilterBtn(screen)).toBeInTheDocument();
  });

  test('creates a note from an empty browser', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);

    const screen = await render(<NotesBrowser id={docId} />, {
      wrapper: TestingProvider
    });
    await expect.element(getAddBtn(screen)).toBeInTheDocument();
    await expect.element(getNotePreview(screen, '')).not.toBeInTheDocument();
    await expect.element(getContentEditor(screen)).not.toBeInTheDocument();

    await getAddBtn(screen).click();

    expect(fetchNotesQuery.getResults({ itemId: docId })).toHaveLength(1);

    await expect.element(getNotePreview(screen, '')).toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
    await expect.element(getAddBtn(screen)).toBeInTheDocument();

    expect(
      resumeService.getResumeState(docId)?.lastSelectedNoteId
    ).toBeDefined();
  });

  test('renders a non-empty notes browser', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const note1 = docAnnotationsService.addNote(docId);
    docAnnotationsService.edit(note1, JSON.parse(getNewContent('test 1')));
    const note2 = docAnnotationsService.addNote(docId);
    docAnnotationsService.edit(note2, JSON.parse(getNewContent('test 2')));

    const screen = await render(<NotesBrowser id={docId} />, {
      wrapper: TestingProvider
    });
    await expect.element(getSelectANoteNote(screen)).toBeInTheDocument();
    await expect.element(getCreateANoteNote(screen)).not.toBeInTheDocument();
    await expect.element(getAddBtn(screen)).toBeInTheDocument();
    await expect.element(getSortFilterBtn(screen)).toBeInTheDocument();

    await expect.element(getNotePreview(screen, 'test 1')).toBeInTheDocument();
    await expect.element(getNotePreview(screen, 'test 2')).toBeInTheDocument();

    await expect.element(getContentEditor(screen)).not.toBeInTheDocument();
  });

  test('opens the last selected note on render', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const note1 = docAnnotationsService.addNote(docId);
    docAnnotationsService.edit(note1, JSON.parse(getNewContent('test 1')));
    const note2 = docAnnotationsService.addNote(docId);
    docAnnotationsService.edit(note2, JSON.parse(getNewContent('test 2')));
    resumeService.setLastSelectedNote(docId, note1);

    const screen = await render(<NotesBrowser id={docId} />, {
      wrapper: TestingProvider
    });
    await expect.element(getSelectANoteNote(screen)).not.toBeInTheDocument();
    await expect.element(getCreateANoteNote(screen)).not.toBeInTheDocument();
    await expect.element(getAddBtn(screen)).toBeInTheDocument();
    await expect.element(getSortFilterBtn(screen)).toBeInTheDocument();

    await expect.element(getNotePreview(screen, 'test 1')).toBeInTheDocument();
    await expect.element(getNotePreview(screen, 'test 2')).toBeInTheDocument();

    await expect
      .element(getNotePreview(screen, 'test 1'))
      .toHaveAttribute('disabled');
    await expect
      .element(getNotePreview(screen, 'test 2'))
      .not.toHaveAttribute('disabled');

    await expect.element(getContentEditor(screen)).toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toHaveTextContent('test 1');
  });

  test('select another existing note', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const note1 = docAnnotationsService.addNote(docId);
    docAnnotationsService.edit(note1, JSON.parse(getNewContent('test 1')));
    const note2 = docAnnotationsService.addNote(docId);
    docAnnotationsService.edit(note2, JSON.parse(getNewContent('test 2')));
    resumeService.setLastSelectedNote(docId, note1);

    const screen = await render(<NotesBrowser id={docId} />, {
      wrapper: TestingProvider
    });

    await expect.element(getNotePreview(screen, 'test 1')).toBeInTheDocument();
    await expect.element(getNotePreview(screen, 'test 2')).toBeInTheDocument();
    await expect
      .element(getNotePreview(screen, 'test 1'))
      .toHaveAttribute('disabled');
    await expect
      .element(getNotePreview(screen, 'test 2'))
      .not.toHaveAttribute('disabled');
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toHaveTextContent('test 1');

    await getNotePreview(screen, 'test 2').element().click();

    await expect
      .element(getNotePreview(screen, 'test 1'))
      .not.toHaveAttribute('disabled');
    await expect
      .element(getNotePreview(screen, 'test 2'))
      .toHaveAttribute('disabled');
    await expect.element(getContentEditor(screen)).toHaveTextContent('test 2');
  });

  test('toggle note info', async () => {
    vi.useFakeTimers();
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const note1 = docAnnotationsService.addNote(docId);
    vi.advanceTimersByTime(100);
    docAnnotationsService.edit(note1, JSON.parse(getNewContent('test 1')));
    resumeService.setLastSelectedNote(docId, note1);
    vi.useRealTimers();
    const noteInfo = docAnnotationsService.getAnnotInfo(note1);

    const screen = await render(
      <BottomSheet>
        <NotesBrowser id={docId} />
      </BottomSheet>,
      {
        wrapper: TestingProvider
      }
    );
    await expect.element(getSelectANoteNote(screen)).not.toBeInTheDocument();
    await expect.element(getCreateANoteNote(screen)).not.toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toHaveTextContent('test 1');

    await expect.element(getToggleActionsBtn(screen)).toBeInTheDocument();
    await expect.element(getSwitchNoteInfoBtn(screen)).not.toBeInTheDocument();
    await expect
      .element(getCreatedAtNoteInfo(screen, noteInfo.createdAt))
      .not.toBeInTheDocument();

    await getToggleActionsBtn(screen).click();

    await expect.element(getSwitchNoteInfoBtn(screen)).toBeInTheDocument();
    await expect
      .element(getCreatedAtNoteInfo(screen, noteInfo.createdAt))
      .toBeInTheDocument();
    await expect
      .element(getUpdatedAtNoteInfo(screen, noteInfo.updatedAt))
      .not.toBeInTheDocument();

    await getSwitchNoteInfoBtn(screen).click();
    await expect
      .element(getCreatedAtNoteInfo(screen, noteInfo.createdAt))
      .not.toBeInTheDocument();
    await expect
      .element(getUpdatedAtNoteInfo(screen, noteInfo.updatedAt))
      .toBeInTheDocument();
  });

  test('delete the selected note', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const note1 = docAnnotationsService.addNote(docId);
    docAnnotationsService.edit(note1, JSON.parse(getNewContent('test 1')));
    const note2 = docAnnotationsService.addNote(docId);
    docAnnotationsService.edit(note2, JSON.parse(getNewContent('test 2')));
    resumeService.setLastSelectedNote(docId, note1);

    const screen = await render(
      <BottomSheet>
        <NotesBrowser id={docId} />
      </BottomSheet>,
      {
        wrapper: TestingProvider
      }
    );
    await expect.element(getSelectANoteNote(screen)).not.toBeInTheDocument();
    await expect.element(getCreateANoteNote(screen)).not.toBeInTheDocument();
    await expect.element(getAddBtn(screen)).toBeInTheDocument();
    await expect.element(getSortFilterBtn(screen)).toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toBeInTheDocument();
    await expect.element(getContentEditor(screen)).toHaveTextContent('test 1');

    await expect.element(getToggleActionsBtn(screen)).toBeInTheDocument();
    await expect.element(getDeleteNoteBtn(screen)).not.toBeInTheDocument();

    await getToggleActionsBtn(screen).click();
    await expect.element(getDeleteNoteBtn(screen)).toBeInTheDocument();

    await getDeleteNoteBtn(screen).click();

    await expect
      .element(screen.locator.getByText('Are you sure?'))
      .toBeInTheDocument();
    const confirmButton = screen.locator.getByRole('button', {
      name: 'Confirm'
    });
    await expect.element(confirmButton).toBeInTheDocument();

    await confirmButton.click();

    // note deleted
    await expect.element(getSelectANoteNote(screen)).toBeInTheDocument();
    await expect
      .element(getNotePreview(screen, 'test 1'))
      .not.toBeInTheDocument();
    await expect.element(getNotePreview(screen, 'test 2')).toBeInTheDocument();

    expect(docAnnotationsService.getContent(note1)).toBeUndefined();
  });

  test('change notes sort order', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const note1 = docAnnotationsService.addNote(docId, 0);
    docAnnotationsService.edit(note1, JSON.parse(getNewContent('test 1')));
    const note2 = docAnnotationsService.addNote(docId, 3);
    docAnnotationsService.edit(note2, JSON.parse(getNewContent('test 2')));
    const note3 = docAnnotationsService.addNote(docId, 1);
    docAnnotationsService.edit(note3, JSON.parse(getNewContent('test 3')));

    const screen = await render(<NotesBrowser id={docId} />, {
      wrapper: TestingProvider
    });

    // test sort order
    const itemsBefore = document.querySelectorAll('ion-item');
    expect(itemsBefore[0]).toHaveTextContent('test 1');
    expect(itemsBefore[1]).toHaveTextContent('test 2');
    expect(itemsBefore[2]).toHaveTextContent('test 3');

    await expect.element(getSortFilterBtn(screen)).toBeInTheDocument();
    await getSortFilterBtn(screen).click();

    await expect.element(getSortSwitchDirectionBtn(screen)).toBeInTheDocument();

    // open the select
    const selectedSort = screen.locator.getByPlaceholder('Creation Date');
    await expect.element(selectedSort).toBeInTheDocument();
    await selectedSort.click();

    const confirmButton = screen.locator.getByRole('button', {
      name: 'Ok'
    });
    await expect.element(confirmButton).toBeInTheDocument();

    const radioCreationDate = screen.locator.getByRole('radio', {
      name: 'Creation Date'
    });
    const radioManual = screen.locator.getByRole('radio', { name: 'Manual' });
    await expect.element(radioCreationDate).toBeInTheDocument();
    await expect.element(radioManual).toBeInTheDocument();

    await expect
      .element(radioCreationDate)
      .toHaveAttribute('aria-checked', 'true');
    await expect.element(radioManual).toHaveAttribute('aria-checked', 'false');

    // change sort
    await radioManual.click();
    await confirmButton.click();

    await expect.element(selectedSort).not.toBeInTheDocument();
    await expect
      .element(screen.locator.getByPlaceholder('Manual'))
      .toBeInTheDocument();

    // check sort order changed
    const itemsAfter = document.querySelectorAll('ion-item');
    expect(itemsAfter[0]).toHaveTextContent('test 1');
    expect(itemsAfter[1]).toHaveTextContent('test 3');
    expect(itemsAfter[2]).toHaveTextContent('test 2');
  });

  test.todo('drag is disabled when sort is not manual', async () => {});
  test.todo('drag enabled when sort is manual', async () => {});
});
