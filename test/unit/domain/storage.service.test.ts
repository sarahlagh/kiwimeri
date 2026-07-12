import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space, spaceContent } from '@/core/db/store';
import { SpaceContentTables, SpaceTables } from '@/core/db/store-constants';
import collectionService from '@/domain/collection/collection.service';
import { docAnnotationsService } from '@/domain/collection/doc-annotations.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import { historyService } from '@/domain/history/history.service';
import storageService from '@/domain/storage.service';
import { LocalChangeType } from '@/domain/synchronization/local-changes';
import localChangesService from '@/domain/synchronization/local-changes.service';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import { adv, getNewContent } from '@@/_setup/test.utils';

function initData() {
  const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
  adv(() =>
    collectionService.setItemLexicalContent(
      docId,
      JSON.parse(getNewContent('doc'))
    )
  );
  const noteId = docAnnotationsService.addNote(docId);
  adv(() =>
    docAnnotationsService.edit(noteId, JSON.parse(getNewContent('annot')))
  );
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
    it('should import then restore without history and stats', () => {
      // create init data (1 doc 1 annot)
      const { docId, noteId } = initData();
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1);

      // test export
      const exportedContent = storageService.exportJson(false);
      const exportedTables = JSON.parse(exportedContent)[0];
      expect(exportedTables[SpaceTables.Collection]).toBeDefined();
      expect(exportedTables[SpaceTables.Annotations]).toBeDefined();
      expect(exportedTables[SpaceTables.History]).toBeUndefined();
      expect(exportedTables[SpaceContentTables.HistoryContent]).toBeUndefined();
      expect(exportedTables[SpaceTables.Stats]).toBeUndefined();
      expect(spaceContent.getRowCount(SpaceContentTables.HistoryContent)).toBe(
        2
      );

      // del data to test restore
      storageService.nukeSpace();
      userPrefs.set('historyIdleTime', 0);
      userPrefs.set('statsEnabled', true);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(2);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(spaceContent.getRowCount(SpaceContentTables.DerivedContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.History)).toBe(1);
      expect(spaceContent.getRowCount(SpaceContentTables.HistoryContent)).toBe(
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
      expect(exportedTables[SpaceTables.History]).toBeDefined();
      expect(exportedTables[SpaceContentTables.HistoryContent]).toBeDefined();
      expect(exportedTables[SpaceTables.Stats]).toBeDefined();
      expect(space.getRowCount(SpaceTables.History)).toBe(2);
      expect(spaceContent.getRowCount(SpaceContentTables.HistoryContent)).toBe(
        2
      );

      // del data to test restore
      storageService.nukeSpace();
      userPrefs.set('historyIdleTime', 0);
      userPrefs.set('statsEnabled', true);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(2);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(spaceContent.getRowCount(SpaceContentTables.DerivedContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.History)).toBe(3); // +1
      expect(spaceContent.getRowCount(SpaceContentTables.HistoryContent)).toBe(
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

      // update collection, leave annot untouched
      collectionService.setItemTitle(docId, 'new title');
      expect(space.getRowCount(SpaceTables.History)).toBe(2);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(1);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(spaceContent.getRowCount(SpaceContentTables.DerivedContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.History)).toBe(2); // unchanged
      expect(spaceContent.getRowCount(SpaceContentTables.HistoryContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1);

      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges[0].change).toBe(LocalChangeType.update);
      expect(localChanges[0].itemId).toBe(docId);
    });

    it('should handle deleted rows without history and stats', () => {
      // create init data (1 doc 1 annot)
      initData();
      const exportedContent = storageService.exportJson(false);

      // update collection, leave annot untouched
      const docId2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(space.getRowCount(SpaceTables.History)).toBe(3);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(1);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(spaceContent.getRowCount(SpaceContentTables.DerivedContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.History)).toBe(4); // + 1 deleted
      expect(historyService.getLatestVersion(docId2)?.op).toBe('deleted');
      expect(spaceContent.getRowCount(SpaceContentTables.HistoryContent)).toBe(
        3
      );
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1);

      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges[0].change).toBe(LocalChangeType.delete);
      expect(localChanges[0].itemId).toBe(docId2);
    });

    it('should handle updated rows with history and stats', () => {
      // create init data (1 doc 1 annot)
      const { docId } = initData();
      const exportedContent = storageService.exportJson(true);

      // update collection, leave annot untouched
      collectionService.setItemTitle(docId, 'new title');
      expect(space.getRowCount(SpaceTables.History)).toBe(2);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(1);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(spaceContent.getRowCount(SpaceContentTables.DerivedContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.History)).toBe(2); // unchanged
      expect(spaceContent.getRowCount(SpaceContentTables.HistoryContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1);

      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges[0].change).toBe(LocalChangeType.update);
      expect(localChanges[0].itemId).toBe(docId);
    });

    it('should handle deleted rows with history and stats', () => {
      // create init data (1 doc 1 annot)
      initData();
      expect(space.getRowCount(SpaceTables.History)).toBe(2);
      const exportedContent = storageService.exportJson(true);

      // update collection, leave annot untouched
      const docId2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(space.getRowCount(SpaceTables.History)).toBe(3);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(1);
      expect(space.getRowCount(SpaceTables.ResumeState)).toBe(0);
      expect(spaceContent.getRowCount(SpaceContentTables.DerivedContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.History)).toBe(2);
      expect(historyService.getLatestVersion(docId2)).toBeUndefined();
      expect(spaceContent.getRowCount(SpaceContentTables.HistoryContent)).toBe(
        2
      );
      expect(space.getRowCount(SpaceTables.Stats)).toBe(1);

      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges[0].change).toBe(LocalChangeType.delete);
      expect(localChanges[0].itemId).toBe(docId2);
    });
    // TODO test that derived state / preview / content is really cleared
    // TODO after sync changes for annotations too!!
  });
});
