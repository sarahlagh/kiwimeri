import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space, spaceArchive, spaceDocContent } from '@/core/db/store';
import {
  SpaceArchiveTables,
  SpaceDocContentTables,
  SpaceTables
} from '@/core/db/store-constants';
import collectionService from '@/domain/collection/collection.service';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import { historyService } from '@/domain/history/history.service';
import { storageService } from '@/domain/profiles/storage.service';
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

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
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

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
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

      // update collection, leave annot untouched
      collectionService.setItemTitle(docId, 'new title');
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(2);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(1);
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
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(3);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(1);
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
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(2);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(1);
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

      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges[0].change).toBe(LocalChangeType.update);
      expect(localChanges[0].itemId).toBe(docId);
    });

    it('should handle deleted rows with history and stats', () => {
      // create init data (1 doc 1 annot)
      initData();
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(2);
      const exportedContent = storageService.exportJson(true);

      // update collection, leave annot untouched
      const docId2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(spaceArchive.getRowCount(SpaceArchiveTables.History)).toBe(3);

      storageService.restoreJson(exportedContent);

      expect(space.getRowCount(SpaceTables.Collection)).toBe(2);
      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.getRowCount(SpaceTables.DerivedState)).toBe(2);
      expect(space.getRowCount(SpaceTables.DerivedPreview)).toBe(2);
      expect(space.getRowCount(SpaceTables.LocalChanges)).toBe(1);
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

      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges[0].change).toBe(LocalChangeType.delete);
      expect(localChanges[0].itemId).toBe(docId2);
    });
    // TODO test that derived state / preview / content is really cleared
    // TODO after sync changes for annotations too!!
  });
});
