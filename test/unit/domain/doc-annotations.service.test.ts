import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import collectionService from '@/db/collection.service';
import { getDerivedId } from '@/domain/derived-content/model';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import { DocAnnotationRow } from '@/domain/document-annotations/model';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/local-changes/model';
import useNotesSort from '@/features/notes-ui/hooks/useNotesSort';
import fetchNotesQuery from '@/features/notes-ui/queries/fetchNotesQuery';
import { getNewContent, wrappedRenderHook } from '@@/_setup/test.utils';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

function getDocUpdatedTs(docId: string) {
  return space.getCell('collection', docId, 'updated') as number;
}

function expectedLC(noteId: string, type: LocalChangeType, updated: number) {
  return {
    id: localChangesService['getLocalChangeId']({
      on: SpaceTables.Annotations,
      change: type,
      itemId: noteId
    }),
    on: SpaceTables.Annotations,
    itemId: noteId,
    change: type,
    createdAt: updated
  };
}

describe('notes service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add a note to a document', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    const noteId = docAnnotationsService.addNote(docId);
    const notes = fetchNotesQuery.getResults({ itemId: docId });
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe(noteId);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
    expect(docAnnotationsService.getAnnotInfo(noteId)).toEqual({
      createdAt: updated + 100,
      updatedAt: updated + 100,
      itemId: docId
    });
    expect(localChangesService.getLocalChanges()).toContainEqual(
      expectedLC(noteId, LocalChangeType.add, updated + 100)
    );
  });

  it('should add notes in bulk to a document', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    const notes: DocAnnotationRow[] = [];
    notes.push(docAnnotationsService.newNoteObj(docId).item);
    notes.push(docAnnotationsService.newNoteObj(docId + 'diff').item);
    docAnnotationsService.saveNotes(docId, notes);

    const noteResults = fetchNotesQuery.getResults({ itemId: docId });
    expect(noteResults).toHaveLength(2);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);

    for (const r of noteResults) {
      expect(localChangesService.getLocalChanges()).toContainEqual(
        expectedLC(r.id, LocalChangeType.add, r.createdAt)
      );
    }
  });

  it('should edit a note', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const noteId = docAnnotationsService.addNote(docId);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    const content = getNewContent('this is the content');
    docAnnotationsService.edit(noteId, JSON.parse(content));

    const note = space.getRow(SpaceTables.Annotations, noteId);
    const derived = space.getRow(
      SpaceTables.DerivedContent,
      getDerivedId('a', noteId)
    );
    expect(unminimizeContentFromStorage(note.content)).toBe(content);
    expect(docAnnotationsService.getContent(noteId)).toBe(note.content);
    expect(derived.plainText).toBe('this is the content');
    expect(note.updatedAt).toBeGreaterThan(updated);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);

    expect(localChangesService.getLocalChanges()).toContainEqual(
      expectedLC(noteId, LocalChangeType.add, note.updatedAt)
    );
  });

  it('should delete a note', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const noteId = docAnnotationsService.addNote(docId);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    docAnnotationsService.delete(noteId);
    expect(fetchNotesQuery.getResults({ itemId: docId })).toHaveLength(0);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
  });

  it('should sort by createdAt by default', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    {
      const { result, unmount } = renderHook(() => useNotesSort(docId));
      expect(result.current).toEqual({
        by: 'createdAt',
        descending: false
      });
      unmount();
    }
  });

  it('should sort by order on demand', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    docAnnotationsService.setNotesSortOnDocument(docId, {
      by: 'order',
      descending: false
    });
    {
      const { result, unmount } = wrappedRenderHook(() => useNotesSort(docId));
      expect(result.current).toEqual({
        by: 'order',
        descending: false
      });
      unmount();
    }
  });

  it('should reorder notes', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const note1 = docAnnotationsService.addNote(docId);
    const note2 = docAnnotationsService.addNote(docId);
    const note3 = docAnnotationsService.addNote(docId);
    const note4 = docAnnotationsService.addNote(docId);
    const note5 = docAnnotationsService.addNote(docId);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    let results = fetchNotesQuery.getResults({ itemId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([note1, note2, note3, note4, note5]);

    docAnnotationsService.reorder(results, 2, 1);

    results = fetchNotesQuery.getResults({ itemId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([note1, note3, note2, note4, note5]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);

    vi.advanceTimersByTime(100);

    docAnnotationsService.reorder(results, 3, 4);

    results = fetchNotesQuery.getResults({ itemId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([note1, note3, note2, note5, note4]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
  });

  it('should reorder new notes', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const note1 = docAnnotationsService.addNote(docId);
    const note2 = docAnnotationsService.addNote(docId);
    const note3 = docAnnotationsService.addNote(docId);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    let results = fetchNotesQuery.getResults({ itemId: docId }, 'order', false);
    docAnnotationsService.reorder(results, 2, 1);

    results = fetchNotesQuery.getResults({ itemId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([note1, note3, note2]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);

    vi.advanceTimersByTime(100);

    // now add new notes!
    const note4 = docAnnotationsService.addNote(docId);
    const note5 = docAnnotationsService.addNote(docId);
    results = fetchNotesQuery.getResults({ itemId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([note4, note5, note1, note3, note2]);
    expect(results.map(r => r.order)).toEqual([-1, -1, 0, 1, 2]);

    docAnnotationsService.reorder(results, 0, 3);

    results = fetchNotesQuery.getResults({ itemId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([note5, note1, note3, note4, note2]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
  });

  it('should add notes with correct order anyway', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    function getResults() {
      return fetchNotesQuery.getResults({ itemId: docId }, 'order', false);
    }
    let results = getResults();
    const note1 = docAnnotationsService.addNote(docId, results.length);
    results = getResults();
    const note2 = docAnnotationsService.addNote(docId, results.length);
    results = getResults();
    const note3 = docAnnotationsService.addNote(docId, results.length);
    results = getResults();
    const note4 = docAnnotationsService.addNote(docId, results.length);
    results = getResults();
    const note5 = docAnnotationsService.addNote(docId, results.length);
    vi.advanceTimersByTime(100);

    results = getResults();
    expect(results.map(r => r.id)).toEqual([note1, note2, note3, note4, note5]);

    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
  });

  it('should reset conflict on content edit', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const note1 = docAnnotationsService.addNote(docId);
    space.setCell(SpaceTables.Annotations, note1, 'conflict', 'conflict-id');

    expect(docAnnotationsService.isConflict(note1));

    docAnnotationsService.edit(note1, JSON.parse(getNewContent('test')));
    expect(!docAnnotationsService.isConflict(note1));
  });
});
