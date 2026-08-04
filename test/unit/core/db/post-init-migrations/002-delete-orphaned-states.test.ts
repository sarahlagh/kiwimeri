import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import Migration from '@/core/db/post-init-migrations/002-delete-orphaned-states';
import { space, spaceDocContent } from '@/core/db/store';
import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import { disableListeners } from '@/core/db/store-listeners';
import collectionService from '@/domain/collection/collection.service';
import { getViewTable } from '@/domain/collection/derived-item-state';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import { historyService } from '@/domain/history/history.service';
import { getNewParsedContent } from '@@/_setup/test.utils';

function assertDerivedTablesAreCleared(on: SpaceTables, id: string) {
  const viewTable = getViewTable(on)!;
  expect(space.hasRow(viewTable, id)).toBe(false);
  expect(space.hasRow(SpaceTables.ProjectedState, id)).toBe(false);
  expect(space.hasRow(SpaceTables.ResumeState, id)).toBe(false);
  expect(
    spaceDocContent.hasRow(SpaceDocContentTables.CollectionContent, id)
  ).toBe(false);
  expect(
    spaceDocContent.hasRow(SpaceDocContentTables.AnnotationContent, id)
  ).toBe(false);
}

function assertDerivedTablesAreNotCleared(on: SpaceTables, id: string) {
  const viewTable = getViewTable(on)!;
  expect(space.hasRow(viewTable, id)).toBe(true);
  expect(space.hasRow(SpaceTables.ProjectedState, id)).toBe(
    on === SpaceTables.Collection
  );
  expect(space.hasRow(SpaceTables.ResumeState, id)).toBe(
    on === SpaceTables.Collection
  );
  expect(
    spaceDocContent.hasRow(SpaceDocContentTables.CollectionContent, id)
  ).toBe(on === SpaceTables.Collection);
  expect(
    spaceDocContent.hasRow(SpaceDocContentTables.AnnotationContent, id)
  ).toBe(on === SpaceTables.Annotations);
}

describe('002-delete-orphaned-states', () => {
  beforeEach(() => {
    historyService['enabled'] = true;
  });

  it('should not throw on empty db', () => {
    Migration(space as never, spaceDocContent as never);
    // should not throw
  });

  it('should not clear existing rows', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemLexicalContent(id, getNewParsedContent('test'));
    const noteId = annotsService.addNote(id);
    annotsService.edit(noteId, getNewParsedContent('another test'));
    resumeService.setLastSelectedNote(id, noteId);
    disableListeners(() => {
      Migration(space as never, spaceDocContent as never);
    });

    assertDerivedTablesAreNotCleared(SpaceTables.Collection, id);
    assertDerivedTablesAreNotCleared(SpaceTables.Annotations, noteId);
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
      Migration(space as never, spaceDocContent as never);
    });

    assertDerivedTablesAreCleared(SpaceTables.Collection, id);
    assertDerivedTablesAreNotCleared(SpaceTables.Annotations, noteId);
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
      Migration(space as never, spaceDocContent as never);
    });

    assertDerivedTablesAreNotCleared(SpaceTables.Collection, id);
    assertDerivedTablesAreCleared(SpaceTables.Annotations, noteId);
  });
});
