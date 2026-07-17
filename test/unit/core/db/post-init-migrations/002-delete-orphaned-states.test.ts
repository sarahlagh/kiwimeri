import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import Migration from '@/core/db/post-init-migrations/002-delete-orphaned-states';
import { space, spaceArchive } from '@/core/db/store';
import { SpaceArchiveTables, SpaceTables } from '@/core/db/store-constants';
import { disableListeners } from '@/core/db/store-listeners';
import collectionService from '@/domain/collection/collection.service';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import {
  DerivedPrefix,
  getDerivedId
} from '@/domain/collection/document-content';
import { resumeService } from '@/domain/collection/resume-state.service';
import { historyService } from '@/domain/history/history.service';
import { getNewParsedContent } from '@@/_setup/test.utils';

function assertDerivedTablesAreCleared(on: 'c' | 'a', id: string) {
  expect(space.hasRow(SpaceTables.DerivedPreview, getDerivedId(on, id))).toBe(
    false
  );
  expect(space.hasRow(SpaceTables.DerivedState, id)).toBe(false);
  expect(space.hasRow(SpaceTables.ResumeState, id)).toBe(false);
  expect(spaceArchive.hasRow(SpaceArchiveTables.CollectionContent, id)).toBe(
    false
  );
  expect(spaceArchive.hasRow(SpaceArchiveTables.AnnotationContent, id)).toBe(
    false
  );
  expect(
    spaceArchive.hasRow(SpaceArchiveTables.DerivedContent, getDerivedId(on, id))
  ).toBe(false);
}

function assertDerivedTablesAreNotCleared(on: DerivedPrefix, id: string) {
  expect(space.hasRow(SpaceTables.DerivedPreview, getDerivedId(on, id))).toBe(
    true
  );
  expect(space.hasRow(SpaceTables.DerivedState, id)).toBe(on === 'c');
  expect(space.hasRow(SpaceTables.ResumeState, id)).toBe(on === 'c');
  // expect(spaceArchive.hasRow(SpaceArchiveTables.CollectionContent, id)).toBe(
  //   on === 'c'
  // );
  // expect(spaceArchive.hasRow(SpaceArchiveTables.AnnotationContent, id)).toBe(
  //   on === 'a'
  // );
  expect(
    spaceArchive.hasRow(SpaceArchiveTables.DerivedContent, getDerivedId(on, id))
  ).toBe(true);
}

describe('002-delete-orphaned-states', () => {
  beforeEach(() => {
    historyService['enabled'] = true;
  });

  it('should not throw on empty db', () => {
    Migration(space as never, spaceArchive as never);
    // should not throw
  });

  it('should not clear existing rows', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemLexicalContent(id, getNewParsedContent('test'));
    const noteId = annotsService.addNote(id);
    annotsService.edit(noteId, getNewParsedContent('another test'));
    resumeService.setLastSelectedNote(id, noteId);
    disableListeners(() => {
      Migration(space as never, spaceArchive as never);
    });

    assertDerivedTablesAreNotCleared('c', id);
    assertDerivedTablesAreNotCleared('a', noteId);
  });

  it('should clear orphaned items', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemLexicalContent(id, getNewParsedContent('test'));
    const noteId = annotsService.addNote(id);
    annotsService.edit(noteId, getNewParsedContent('another test'));
    resumeService.setLastSelectedNote(id, noteId);

    // orphan id
    disableListeners(() => {
      space.delRow(SpaceTables.Collection, id);
      Migration(space as never, spaceArchive as never);
    });

    assertDerivedTablesAreCleared('c', id);
    assertDerivedTablesAreNotCleared('a', noteId);
  });

  it('should clear orphaned annots', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemLexicalContent(id, getNewParsedContent('test'));
    const noteId = annotsService.addNote(id);
    annotsService.edit(noteId, getNewParsedContent('another test'));
    resumeService.setLastSelectedNote(id, noteId);

    // orphan id
    disableListeners(() => {
      space.delRow(SpaceTables.Annotations, noteId);
      Migration(space as never, spaceArchive as never);
    });

    assertDerivedTablesAreNotCleared('c', id);
    assertDerivedTablesAreCleared('a', noteId);
  });
});
