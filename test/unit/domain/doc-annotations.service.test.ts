import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space, spaceDocContent } from '@/core/db/store';
import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import collectionService from '@/domain/collection/collection.service';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { BaseDocAnnotation } from '@/domain/collection/document-annotations';
import { LocalChangeType } from '@/domain/synchronization/local-changes';
import localChangesService from '@/domain/synchronization/local-changes.service';
import useNotesSort from '@/features/collection-notes-ui/hooks/useNotesSort';
import fetchNotesQuery from '@/features/collection-notes-ui/queries/fetchNotesQuery';
import {
  getNewContent,
  getNewParsedContent,
  wrappedRenderHook
} from '@@/_setup/test.utils';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

function getDocUpdatedTs(docId: string) {
  return space.getCell('collection', docId, 'updatedAt') as number;
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
    createdAt: updated,
    previousHash: 0
  };
}

function assertDerivedTablesCleared(id: string) {
  expect(space.hasRow(SpaceTables.AnnotationView, id)).toBe(false);
  expect(
    spaceDocContent.hasRow(SpaceDocContentTables.AnnotationContent, id)
  ).toBe(false);
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

    const noteId = annotsService.addNote(docId);
    const notes = fetchNotesQuery.getResults({ parentId: docId });
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe(noteId);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
    expect(annotsService.getAnnotInfo(noteId)).toEqual({
      createdAt: updated + 100,
      updatedAt: updated + 100,
      parentId: docId
    });
    expect(localChangesService.getLocalChanges()).toContainEqual(
      expectedLC(noteId, LocalChangeType.add, updated + 100)
    );
  });

  it('should add notes in bulk to a document', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    const notes: BaseDocAnnotation[] = [];
    notes.push(annotsService.newNoteObj(docId).item);
    notes.push(annotsService.newNoteObj(docId + 'diff').item);
    annotsService.saveNotes(docId, notes);

    const noteResults = fetchNotesQuery.getResults({ parentId: docId });
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
    const noteId = annotsService.addNote(docId);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    const content = getNewContent('this is the content');
    annotsService.edit(noteId, JSON.parse(content));

    const note = space.getRow(SpaceTables.Annotations, noteId);
    const noteContent = annotsService.getContent(noteId);
    const derived = spaceDocContent.getRow(
      SpaceDocContentTables.AnnotationContent,
      noteId
    );
    expect(noteContent).toBe(content);
    expect(derived.plainText).toBe('this is the content');
    expect(note.updatedAt).toBeGreaterThan(updated);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);

    expect(localChangesService.getLocalChanges()).toContainEqual(
      expectedLC(noteId, LocalChangeType.add, note.updatedAt)
    );
  });

  it('should delete a note', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const noteId = annotsService.addNote(docId);
    annotsService.edit(noteId, getNewParsedContent('test'));
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    annotsService.delete(noteId);
    expect(fetchNotesQuery.getResults({ parentId: docId })).toHaveLength(0);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
    assertDerivedTablesCleared(noteId);
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
    annotsService.setNotesSortOnDocument(docId, {
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
    const note1 = annotsService.addNote(docId);
    const note2 = annotsService.addNote(docId);
    const note3 = annotsService.addNote(docId);
    const note4 = annotsService.addNote(docId);
    const note5 = annotsService.addNote(docId);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    let results = fetchNotesQuery.getResults(
      { parentId: docId },
      'order',
      false
    );
    expect(results.map(r => r.id)).toEqual([note1, note2, note3, note4, note5]);

    annotsService.reorder(results, 2, 1);

    results = fetchNotesQuery.getResults({ parentId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([note1, note3, note2, note4, note5]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);

    vi.advanceTimersByTime(100);

    annotsService.reorder(results, 3, 4);

    results = fetchNotesQuery.getResults({ parentId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([note1, note3, note2, note5, note4]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
  });

  it('should reorder new notes', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const note1 = annotsService.addNote(docId);
    const note2 = annotsService.addNote(docId);
    const note3 = annotsService.addNote(docId);
    const updated = getDocUpdatedTs(docId);
    vi.advanceTimersByTime(100);

    let results = fetchNotesQuery.getResults(
      { parentId: docId },
      'order',
      false
    );
    annotsService.reorder(results, 2, 1);

    results = fetchNotesQuery.getResults({ parentId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([note1, note3, note2]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);

    vi.advanceTimersByTime(100);

    // now add new notes!
    const note4 = annotsService.addNote(docId);
    const note5 = annotsService.addNote(docId);
    results = fetchNotesQuery.getResults({ parentId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([note4, note5, note1, note3, note2]);
    expect(results.map(r => r.order)).toEqual([-1, -1, 0, 1, 2]);

    annotsService.reorder(results, 0, 3);

    results = fetchNotesQuery.getResults({ parentId: docId }, 'order', false);
    expect(results.map(r => r.id)).toEqual([note5, note1, note3, note4, note2]);
    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
    expect(getDocUpdatedTs(docId)).toBeGreaterThan(updated);
  });

  it('should add notes with correct order anyway', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    function getResults() {
      return fetchNotesQuery.getResults({ parentId: docId }, 'order', false);
    }
    let results = getResults();
    const note1 = annotsService.addNote(docId, results.length);
    results = getResults();
    const note2 = annotsService.addNote(docId, results.length);
    results = getResults();
    const note3 = annotsService.addNote(docId, results.length);
    results = getResults();
    const note4 = annotsService.addNote(docId, results.length);
    results = getResults();
    const note5 = annotsService.addNote(docId, results.length);
    vi.advanceTimersByTime(100);

    results = getResults();
    expect(results.map(r => r.id)).toEqual([note1, note2, note3, note4, note5]);

    expect(results.map(r => r.order)).toEqual([0, 1, 2, 3, 4]);
  });

  it('should reset conflict on content edit', () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const note1 = annotsService.addNote(docId);
    space.setCell(SpaceTables.Annotations, note1, 'conflictId', 'conflict-id');

    expect(annotsService.isConflict(note1));

    annotsService.edit(note1, JSON.parse(getNewContent('test')));
    expect(!annotsService.isConflict(note1));
  });
});
