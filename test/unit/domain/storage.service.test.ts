import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space, spaceArchive, spaceDocContent } from '@/core/db/store';
import {
  SpaceArchiveTables,
  SpaceDocContentTables,
  SpaceTables
} from '@/core/db/store-constants';
import { CollectionItemType } from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import { historyService } from '@/domain/history/history.service';
import { storageService } from '@/domain/space-merging/storage.service';
import { SpacePortableData } from '@/domain/space-merging/types';
import { LocalChangeType } from '@/domain/synchronization/local-changes';
import localChangesService from '@/domain/synchronization/local-changes.service';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import { adv, getNewContent, getNewParsedContent } from '@@/_setup/test.utils';

function initData() {
  const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
  adv(() =>
    collectionService.setItemLexicalContent(
      docId,
      JSON.parse(getNewContent('doc'))
    )
  );
  const noteId = annotsService.addNote(docId);
  adv(() => annotsService.edit(noteId, JSON.parse(getNewContent('annot'))));
  resumeService.setLastSelectedNote(docId, noteId);
  return { docId, noteId };
}

describe('storage service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    historyService['enabled'] = true;
    userPrefs.set('historyIdleTime', 0);
    userPrefs.set('statsEnabled', true);
  });
  afterEach(() => {
    vi.useRealTimers();
    historyService['enabled'] = false;
    userPrefs.set('historyIdleTime', null);
    userPrefs.set('statsEnabled', false);
  });
  describe('import / restore raw collection json', () => {
    it('should throw if no schemaVersion and display_opts present', () => {
      expect(() =>
        storageService.restoreJson(JSON.stringify('invalid'))
      ).toThrow();
      expect(() => storageService.restoreJson(JSON.stringify({}))).toThrow();
      expect(() => storageService.restoreJson(JSON.stringify([]))).toThrow();
      expect(() =>
        storageService.restoreJson(JSON.stringify([{ wrongTable: {} }]))
      ).toThrow();
      expect(() =>
        storageService.restoreJson(
          JSON.stringify([
            {
              collection: {
                0: { display_opts: {} }
              }
            }
          ])
        )
      ).toThrow();
      expect(() =>
        storageService.restoreJson(
          JSON.stringify([
            {
              collection: {
                0: { settings: {} }
              }
            }
          ])
        )
      ).toThrow();
    });

    it('should import then restore without history and stats', () => {
      // create init data (1 doc 1 annot)
      const { docId, noteId } = initData();
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1);

      // test export
      const exportedContent = storageService.exportJson(false);
      const exportedTables = JSON.parse(exportedContent)[0];
      expect(exportedTables[SpaceTables.Collection]).toBeDefined();
      expect(exportedTables[SpaceTables.Annotations]).toBeDefined();
      expect(exportedTables[SpaceArchiveTables.History]).toBeUndefined();
      expect(exportedTables[SpaceArchiveTables.HistoryContent]).toBeUndefined();
      expect(exportedTables[SpaceTables.Stats]).toBeUndefined();
      expect(spaceArchive.getRowCount(SpaceArchiveTables.HistoryContent)).toBe(
        2
      );

      // del data to test restore
      storageService.nukeSpace();
      userPrefs.set('historyIdleTime', 0);
      userPrefs.set('statsEnabled', true);
      localChangesService.clear();

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.ProjectedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.CollectionItemView)).toBe(2); // all items have updatedAtRank so notebook + doc
      expect(space.getRowCount(SpaceTables.AnnotationView)).toBe(1);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(2);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.CollectionContent)
      ).toBe(1);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.AnnotationContent)
      ).toBe(1);
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(1);
      expect(spaceArchive.getRowCount(SpaceArchiveTables.HistoryContent)).toBe(
        1
      );
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1);

      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges[0].change).toBe(LocalChangeType.add);
      expect(localChanges[0].itemId).toBe(noteId);
      expect(localChanges[1].change).toBe(LocalChangeType.add);
      expect(localChanges[1].itemId).toBe(docId);
    });

    it('should import then restore with history and stats', () => {
      // create init data (1 doc 1 annot)
      const { docId, noteId } = initData();

      // test export
      const exportedContent = storageService.exportJson(true);
      const exportedTables = JSON.parse(exportedContent)[0];
      expect(exportedTables[SpaceTables.Collection]).toBeDefined();
      expect(exportedTables[SpaceTables.Annotations]).toBeDefined();
      expect(exportedTables[SpaceArchiveTables.History]).toBeDefined();
      expect(exportedTables[SpaceArchiveTables.HistoryContent]).toBeDefined();
      expect(exportedTables[SpaceTables.Stats]).toBeDefined();
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(2);
      expect(spaceArchive.getRowCount(SpaceArchiveTables.HistoryContent)).toBe(
        2
      );

      // del data to test restore
      storageService.nukeSpace();
      userPrefs.set('historyIdleTime', 0);
      userPrefs.set('statsEnabled', true);
      localChangesService.clear();

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.ProjectedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.CollectionItemView)).toBe(2); // all items have updatedAtRank so notebook + doc
      expect(space.getRowCount(SpaceTables.AnnotationView)).toBe(1);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(2);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.CollectionContent)
      ).toBe(1);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.AnnotationContent)
      ).toBe(1);
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(3); // +1
      expect(spaceArchive.getRowCount(SpaceArchiveTables.HistoryContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1); // unchanged

      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges[0].change).toBe(LocalChangeType.add);
      expect(localChanges[0].itemId).toBe(noteId);
      expect(localChanges[1].change).toBe(LocalChangeType.add);
      expect(localChanges[1].itemId).toBe(docId);
    });

    it('should handle updated rows without history and stats', () => {
      // create init data (1 doc 1 annot)
      const { docId } = initData();
      const exportedContent = storageService.exportJson(false);
      localChangesService.clear();

      // update collection, leave annot untouched
      collectionService.setItemTitle(docId, 'new title');
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(2);

      storageService.restoreJson(exportedContent); // reverts change

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.ProjectedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.CollectionItemView)).toBe(2); // all items have updatedAtRank so notebook + doc
      expect(space.getRowCount(SpaceTables.AnnotationView)).toBe(1);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(0);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.CollectionContent)
      ).toBe(1);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.AnnotationContent)
      ).toBe(1);
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(2); // unchanged
      expect(spaceArchive.getRowCount(SpaceArchiveTables.HistoryContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1);
    });

    it('should handle deleted rows without history and stats', () => {
      // create init data (1 doc 1 annot)
      initData();
      localChangesService.clear();
      const exportedContent = storageService.exportJson(false);

      // update collection, leave annot untouched
      const docId2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(3);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.ProjectedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.CollectionItemView)).toBe(2); // all items have updatedAtRank so notebook + doc
      expect(space.getRowCount(SpaceTables.AnnotationView)).toBe(1);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(0);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.CollectionContent)
      ).toBe(1);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.AnnotationContent)
      ).toBe(1);
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(4); // + 1 deleted
      expect(historyService.getLatestVersion(docId2)?.op).toBe('deleted');
      expect(spaceArchive.getRowCount(SpaceArchiveTables.HistoryContent)).toBe(
        3
      );
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1);
    });

    it('should handle updated rows with history and stats', () => {
      // create init data (1 doc 1 annot)
      const { docId } = initData();
      localChangesService.clear();
      const exportedContent = storageService.exportJson(true);

      // update collection, leave annot untouched
      collectionService.setItemTitle(docId, 'new title');
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(2);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.ProjectedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.CollectionItemView)).toBe(2); // all items have updatedAtRank so notebook + doc
      expect(space.getRowCount(SpaceTables.AnnotationView)).toBe(1);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(0);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.CollectionContent)
      ).toBe(1);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.AnnotationContent)
      ).toBe(1);
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(2); // unchanged
      expect(spaceArchive.getRowCount(SpaceArchiveTables.HistoryContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1);
    });

    it('should handle deleted rows with history and stats', () => {
      // create init data (1 doc 1 annot)
      initData();
      localChangesService.clear();
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(2);
      const exportedContent = storageService.exportJson(true);

      // update collection, leave annot untouched
      const docId2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(3);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.ProjectedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.CollectionItemView)).toBe(2); // all items have updatedAtRank so notebook + doc
      expect(space.getRowCount(SpaceTables.AnnotationView)).toBe(1);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(0);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.CollectionContent)
      ).toBe(1);
      expect(
        spaceDocContent.getRowCount(SpaceDocContentTables.AnnotationContent)
      ).toBe(1);
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(2);
      expect(historyService.getLatestVersion(docId2)).toBeUndefined();
      expect(spaceArchive.getRowCount(SpaceArchiveTables.HistoryContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1);
    });
    // TODO test that derived state / preview / content is really cleared
  });

  describe('diff table', () => {
    it('should return nothing for unchanged empty spaces', () => {
      const emptySpace: SpacePortableData = {
        items: {},
        annots: {},
        userPrefs: {},
        lastChange: 0,
        schemaVersion: 0
      };

      expect(
        storageService.afterMergeChanges(
          emptySpace,
          structuredClone(emptySpace)
        )
      ).toHaveLength(0);
    });

    it('should return nothing for unchanged spaces', () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      annotsService.addNote(docId);

      const data = storageService.getSpaceRepresentation();

      expect(
        storageService.afterMergeChanges(data, structuredClone(data))
      ).toHaveLength(0);
    });

    it('should handle added rows', () => {
      storageService.nukeSpace();
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      annotsService.addNote(docId);
      const dataAfter = storageService.getSpaceRepresentation();

      storageService.nukeSpace();

      const dataBefore = storageService.getSpaceRepresentation();
      const changes = storageService.afterMergeChanges(dataAfter, dataBefore);
      expect(changes).toHaveLength(3);
      expect(changes.every(ch => ch.change === LocalChangeType.add));
      expect(changes.every(ch => ch.id !== DEFAULT_NOTEBOOK_ID));
    });

    it('should handle conflict rows', () => {
      storageService.nukeSpace();
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      space.setCell(SpaceTables.Collection, docId, 'conflictId', 'other-id');
      collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      annotsService.addNote(docId);
      const dataAfter = storageService.getSpaceRepresentation();

      storageService.nukeSpace();

      const dataBefore = storageService.getSpaceRepresentation();
      const changes = storageService.afterMergeChanges(dataAfter, dataBefore);
      expect(changes).toHaveLength(2);
      expect(changes.every(ch => ch.change === LocalChangeType.add));
      expect(changes.every(ch => ch.id !== DEFAULT_NOTEBOOK_ID));
      expect(changes.every(ch => ch.type !== CollectionItemType.document));
    });

    it('should handle deleted rows', () => {
      storageService.nukeSpace();
      const dataBefore = storageService.getSpaceRepresentation();

      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      annotsService.addNote(docId);
      const dataAfter = storageService.getSpaceRepresentation();

      const changes = storageService.afterMergeChanges(dataAfter, dataBefore);
      expect(changes).toHaveLength(3);
      expect(changes.every(ch => ch.change === LocalChangeType.delete));
      expect(changes.every(ch => ch.id !== DEFAULT_NOTEBOOK_ID));
    });

    it('should handle updated items', () => {
      storageService.nukeSpace();
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      annotsService.addNote(docId);
      const dataBefore = storageService.getSpaceRepresentation();
      localChangesService.clear();
      collectionService.setItemLexicalContent(
        docId,
        getNewParsedContent('test')
      );

      const changes = storageService.afterMergeChanges(
        storageService.getSpaceRepresentation(),
        dataBefore
      );

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        id: docId,
        type: CollectionItemType.document,
        change: LocalChangeType.update,
        on: SpaceTables.Collection,
        field: 'content'
      });
    });

    it('should handle updated annots', () => {
      storageService.nukeSpace();
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      const noteId = annotsService.addNote(docId);
      const dataBefore = storageService.getSpaceRepresentation();
      localChangesService.clear();
      annotsService.edit(noteId, getNewParsedContent('test'));

      const changes = storageService.afterMergeChanges(
        storageService.getSpaceRepresentation(),
        dataBefore
      );

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        id: noteId,
        type: 'note',
        change: LocalChangeType.update,
        on: SpaceTables.Annotations,
        field: 'content'
      });
    });

    it('should handle updated user prefs', () => {
      storageService.nukeSpace();
      userPrefs.set('maxHistoryPerDoc', 100);
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      annotsService.addNote(docId);
      const dataBefore = storageService.getSpaceRepresentation();
      localChangesService.clear();
      userPrefs.set('maxHistoryPerDoc', 50);

      const changes = storageService.afterMergeChanges(
        storageService.getSpaceRepresentation(),
        dataBefore
      );

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        id: 'maxHistoryPerDoc',
        type: undefined,
        change: LocalChangeType.update,
        on: SpaceTables.UserPreference,
        field: 'value'
      });
    });
  });
});
