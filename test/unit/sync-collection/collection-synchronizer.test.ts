import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space, spaceDocContent } from '@/core/db/store';
import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import { setMetaField } from '@/core/db/types';
import { CollectionItemType } from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import { minimizeContentForStorage } from '@/domain/collection/compress-file-content';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { getDerivedId } from '@/domain/collection/document-content';
import { historyService } from '@/domain/history/history.service';
import { conflictsService } from '@/domain/space-merging/conflicts-service';
import { LocalChangeType } from '@/domain/synchronization/local-changes';
import localChangesService from '@/domain/synchronization/local-changes.service';
import {
  CollectionSynchronizer,
  REMOTE_COLLECTION_SCHEMA_VERSION,
  RemoteCollectionFileContent
} from '@/domain/synchronization/synchronizers/collection-synchronizer';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import useItemsConflictMixIn from '@/features/collection-browser/hooks/useItemsConflictMixIn';
import fetchBrowsableItemsQuery from '@/features/collection-browser/queries/fetchBrowsableItemsQuery';
import { useSynchronizationStates } from '@/features/synchronization-ui';
import { InMemDriver } from '@@/_setup/inmem.driver';
import {
  adv,
  getLocalItemConflicts,
  getNewContent,
  oneDocument,
  oneFolder,
  oneNote,
  oneNotebook,
  wrappedRenderHook
} from '@@/_setup/test.utils';
import { describe, it } from 'vitest';

const driver = new InMemDriver();

const synchronizer = new CollectionSynchronizer(
  {
    id: '9999',
    name: 'test'
  },
  driver
);

describe('collection synchronizer', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    synchronizer.destroy();
    synchronizer.configure({ names: ['collection.json'] });
    const { connected } = await synchronizer.connect();
    expect(connected).toBe(true);
    historyService['enabled'] = true;
  });
  afterEach(() => {
    vi.useRealTimers();
    historyService['enabled'] = false;
  });

  it('should trim ids and itemId from collection table in remote format', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const folId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    await synchronizer.sync();
    {
      const { items } = driver.getParsedCollectionContent();
      expect(Object.keys(items)).toHaveLength(3);
      expect(items[DEFAULT_NOTEBOOK_ID]).toBeDefined();
      expect((items[DEFAULT_NOTEBOOK_ID] as any).id).toBeUndefined();
      expect((items[DEFAULT_NOTEBOOK_ID] as any).itemId).toBeUndefined();
      expect(items[docId]).toBeDefined();
      expect((items[docId] as any).id).toBeUndefined();
      expect((items[docId] as any).itemId).toBeUndefined();
      expect(items[folId]).toBeDefined();
      expect((items[folId] as any).id).toBeUndefined();
      expect((items[folId] as any).itemId).toBeUndefined();
    }
  });

  describe('should merge restored items', () => {
    it('should merge restored items', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemLexicalContent(
        docId,
        JSON.parse(getNewContent('test'))
      );
      await synchronizer.push();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
      }

      // delete & push
      vi.advanceTimersByTime(100);
      collectionService.deleteItem(docId);
      await synchronizer.sync();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(1);
      }

      // restore
      const latest = historyService.getLatestVersion(docId);
      historyService.restoreDocumentVersion(docId, latest!.id);

      // then
      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges).toHaveLength(1);
      expect(localChanges[0].change).toBe(LocalChangeType.add);
      expect(localChanges[0].itemId).toBe(docId);

      // sync
      await synchronizer.sync();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
      }
    });

    it('should merge deleted then restored items in same session', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemLexicalContent(
        docId,
        JSON.parse(getNewContent('test'))
      );
      await synchronizer.push();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
      }

      // delete, NOT push
      vi.advanceTimersByTime(100);
      collectionService.deleteItem(docId);
      vi.advanceTimersByTime(100);

      // restore
      const latest = historyService.getLatestVersion(docId);
      historyService.restoreDocumentVersion(docId, latest!.id);

      // then
      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges).toHaveLength(1);
      expect(localChanges[0].change).toBe(LocalChangeType.update);
      expect(localChanges[0].itemId).toBe(docId);
      expect(localChanges[0].field).toBeUndefined();

      // sync
      await synchronizer.sync();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
      }
    });

    it('should merge updated, deleted then restored items in same session', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemLexicalContent(
        docId,
        JSON.parse(getNewContent('test'))
      );
      await synchronizer.push();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
      }

      // update, NOT push
      adv(() => {
        collectionService.setItemLexicalContent(
          docId,
          JSON.parse(getNewContent('test update'))
        );
      });

      // delete, NOT push
      adv(() => {
        collectionService.deleteItem(docId);
      });

      // restore
      adv(() => {
        const latest = historyService.getLatestVersion(docId);
        historyService.restoreDocumentVersion(docId, latest!.id);
      });

      // then
      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges).toHaveLength(1);
      expect(localChanges[0].change).toBe(LocalChangeType.update);
      expect(localChanges[0].itemId).toBe(docId);
      expect(localChanges[0].field).toBeUndefined();

      // sync
      await synchronizer.sync();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId].content).toBe(
          minimizeContentForStorage(JSON.parse(getNewContent('test update')))
        );
      }
    });

    it('should merge updated, deleted then restored items in same session - with more recent remote updates', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemLexicalContent(
        docId,
        JSON.parse(getNewContent('test'))
      );
      await synchronizer.push();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
      }

      // update, NOT push
      adv(() => {
        collectionService.setItemLexicalContent(
          docId,
          JSON.parse(getNewContent('local update'))
        );
      });

      // twist: remote update
      {
        const { items } = driver.getParsedCollectionContent();
        collectionService.setUnsavedItemLexicalContent(
          items[docId],
          JSON.parse(getNewContent('remote update'))
        );
        items[docId].content_meta = setMetaField(Date.now());
        items[docId].updatedAt = Date.now();
        driver.setCollectionContent(items, Date.now());
      }

      // delete, NOT push
      adv(() => {
        collectionService.deleteItem(docId);
      });

      // restore
      adv(() => {
        const latest = historyService.getLatestVersion(docId);
        historyService.restoreDocumentVersion(docId, latest!.id);
      });

      // then
      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges).toHaveLength(1);
      expect(localChanges[0].change).toBe(LocalChangeType.update);
      expect(localChanges[0].itemId).toBe(docId);
      expect(localChanges[0].field).toBeUndefined();

      // sync
      await synchronizer.sync();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId].content).toBe(
          minimizeContentForStorage(JSON.parse(getNewContent('remote update')))
        );
      }
      expect(getLocalItemConflicts()).toHaveLength(0);
    });

    it('should merge updated, deleted then restored items in same session - with less recent remote updates', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemLexicalContent(
        docId,
        JSON.parse(getNewContent('test'))
      );
      await synchronizer.push();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
      }

      // twist: remote update
      {
        const { items } = driver.getParsedCollectionContent();
        collectionService.setUnsavedItemLexicalContent(
          items[docId],
          JSON.parse(getNewContent('remote update'))
        );
        items[docId].content_meta = setMetaField(Date.now());
        items[docId].updatedAt = Date.now();
        driver.setCollectionContent(items, Date.now());
      }

      // update, NOT push
      adv(() => {
        collectionService.setItemLexicalContent(
          docId,
          JSON.parse(getNewContent('local update'))
        );
      });

      // delete, NOT push
      adv(() => {
        collectionService.deleteItem(docId);
      });

      // restore
      adv(() => {
        const latest = historyService.getLatestVersion(docId);
        historyService.restoreDocumentVersion(docId, latest!.id);
      });

      // then
      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges).toHaveLength(1);
      expect(localChanges[0].change).toBe(LocalChangeType.update);
      expect(localChanges[0].itemId).toBe(docId);
      expect(localChanges[0].field).toBeUndefined();

      // sync
      await synchronizer.sync();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
        expect(items[docId].content).toBe(
          minimizeContentForStorage(JSON.parse(getNewContent('local update')))
        );
      }
      expect(getLocalItemConflicts()).toHaveLength(0);
    });

    it('should merge updated, deleted then restored items in same session - with remote updates on other fields', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemLexicalContent(
        docId,
        JSON.parse(getNewContent('test'))
      );
      await synchronizer.push();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
      }

      // twist: remote update on title
      {
        const { items } = driver.getParsedCollectionContent();
        items[docId].title = 'remote title';
        items[docId].title_meta = setMetaField(Date.now());
        items[docId].updatedAt = Date.now();
        driver.setCollectionContent(items, Date.now());
      }

      // update, NOT push
      adv(() => {
        collectionService.setItemLexicalContent(
          docId,
          JSON.parse(getNewContent('local update'))
        );
      });

      // delete, NOT push
      adv(() => {
        collectionService.deleteItem(docId);
      });

      // restore
      adv(() => {
        const latest = historyService.getLatestVersion(docId);
        historyService.restoreDocumentVersion(docId, latest!.id);
      });

      // then
      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges).toHaveLength(1);
      expect(localChanges[0].change).toBe(LocalChangeType.update);
      expect(localChanges[0].itemId).toBe(docId);
      expect(localChanges[0].field).toBeUndefined();

      // sync
      await synchronizer.sync();
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
        expect(items[docId].content).toBe(
          minimizeContentForStorage(JSON.parse(getNewContent('local update')))
        );
        expect(items[docId].title).not.toBe('remote title'); // remote change lost
      }
      expect(getLocalItemConflicts()).toHaveLength(0);
    });
  });

  describe('should merge notes', () => {
    it('should push notes', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const noteId = annotsService.addNote(docId);
      annotsService.edit(noteId, JSON.parse(getNewContent('test')));
      await synchronizer.sync();
      {
        const { items, annots: notes } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
        expect(Object.keys(notes)).toHaveLength(1);
        expect(notes[noteId]).toBeDefined();
      }
    });

    it('should pull notes and fill plainText', async () => {
      const items = [oneNotebook(), oneDocument()];
      const notes = [oneNote(items[1].id!)];
      notes[0].content = getNewContent('test');
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );

      await synchronizer.sync();

      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.hasRow(SpaceTables.Annotations, notes[0].id));
      expect(
        spaceDocContent.getCell(
          SpaceDocContentTables.AnnotationContent,
          notes[0].id,
          'plainText'
        )
      ).toBe('test');
    });

    it('should merge notes', async () => {
      const items = [oneNotebook(), oneDocument()];
      const notes = [oneNote(items[1].id!)];
      const docId = items[1].id!;
      const noteId = notes[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // note pulled

      // update on remote
      notes[0].order = 2;
      notes[0].order_meta = setMetaField(Date.now());
      notes[0].updatedAt = Date.now();
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );

      // update locally
      adv(() => {
        annotsService.edit(noteId, JSON.parse(getNewContent('test')));
      });

      // sync
      await synchronizer.sync();
      {
        const { items, annots: newNotes } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
        expect(Object.keys(newNotes)).toHaveLength(1);
        expect(newNotes[noteId]).toBeDefined();
        expect(newNotes[noteId].order).toBe(2);
        expect(newNotes[noteId].content).toBe(
          space.getCell(SpaceTables.Annotations, noteId, 'content')
        );
      }
    });

    it('should sync notes and let local win if more recent', async () => {
      const items = [oneNotebook(), oneDocument()];
      const notes = [oneNote(items[1].id!)];
      const docId = items[1].id!;
      const noteId = notes[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // note pulled

      // update on remote
      notes[0].content = getNewContent('remote');
      notes[0].content_meta = setMetaField(Date.now());
      notes[0].updatedAt = Date.now();
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );

      // update locally
      adv(() => {
        annotsService.edit(noteId, JSON.parse(getNewContent('local')));
      });

      // sync
      const resp = await synchronizer.sync();
      expect(resp.didPull);
      expect(resp.didPush);
      {
        const { items, annots: newNotes } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
        expect(Object.keys(newNotes)).toHaveLength(1);
        expect(newNotes[noteId]).toBeDefined();
        expect(newNotes[noteId].content).toBe(
          space.getCell(SpaceTables.Annotations, noteId, 'content')
        );
        expect(newNotes[noteId].content).toBe(
          minimizeContentForStorage(JSON.parse(getNewContent('local')))
        );
        expect(!annotsService.isConflict(noteId));
      }
    });

    it('should sync notes and create conflict', async () => {
      const items = [oneNotebook(), oneDocument()];
      const notes = [oneNote(items[1].id!)];
      const docId = items[1].id!;
      const noteId = notes[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // note pulled

      // update locally
      adv(() => {
        annotsService.edit(noteId, JSON.parse(getNewContent('local')));
      });

      // update on remote
      notes[0].content = minimizeContentForStorage(
        JSON.parse(getNewContent('remote'))
      );
      notes[0].content_meta = setMetaField(Date.now());
      notes[0].updatedAt = Date.now();
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );

      // sync
      const resp = await synchronizer.sync();
      expect(resp.didPull);
      expect(!resp.didPush);
      {
        const { items, annots: newNotes } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
        expect(Object.keys(newNotes)).toHaveLength(1);
        expect(newNotes[noteId]).toBeDefined();
        expect(newNotes[noteId].content).toBe(
          space.getCell(SpaceTables.Annotations, noteId, 'content')
        );
        expect(newNotes[noteId].content).toBe(notes[0].content);
        expect(annotsService.isConflict(noteId));
      }
    });

    it('should sync notes and delete orphans', async () => {
      const items = [oneNotebook(), oneDocument()];
      const notes = [oneNote(items[1].id!)];
      const docId = items[1].id!;
      const noteId = notes[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // note pulled

      // add note locally
      const orphanId = annotsService.addNote(docId);
      vi.advanceTimersByTime(100);

      // delete doc & note on remote
      await driver.setCollectionContentWithAnnots([items[0]], [], Date.now());

      await synchronizer.sync();

      expect(!annotsService.exists(noteId));
      expect(!annotsService.exists(orphanId));
    });

    it('should sync notes and delete orphans 2', async () => {
      const items = [oneNotebook(), oneDocument()];
      const notes = [oneNote(items[1].id!)];
      const docId = items[1].id!;
      const noteId = notes[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // note pulled

      // delete doc & note on remote
      await driver.setCollectionContentWithAnnots([items[0]], [], Date.now());
      // add note locally
      vi.advanceTimersByTime(100);
      const orphanId = annotsService.addNote(docId);

      await synchronizer.sync();

      expect(!annotsService.exists(noteId));
      expect(!annotsService.exists(orphanId));
    });

    it('should not delete old annots on pull', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const noteId = annotsService.addNote(docId);

      const items = [oneNotebook(), oneDocument()];
      await driver.setCollectionContentWithAnnots(
        items,
        [],
        items[1].updatedAt
      );

      await synchronizer.sync();

      expect(collectionService.itemExists(docId));
      expect(collectionService.itemExists(items[1].id!));
      expect(annotsService.exists(noteId));
    });

    it('should delete old annots on force pull', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const noteId = annotsService.addNote(docId);

      const items = [oneNotebook(), oneDocument()];
      await driver.setCollectionContentWithAnnots(
        items,
        [],
        items[1].updatedAt
      );

      await synchronizer.pull(true);

      expect(!collectionService.itemExists(docId));
      expect(collectionService.itemExists(items[1].id!));
      expect(!annotsService.exists(noteId));
      expect(space.getRowCount('document_annotation')).toBe(0);
    });

    it('should force pull notes and fill plainText', async () => {
      const items = [oneNotebook(), oneDocument()];
      const notes = [oneNote(items[1].id!)];
      notes[0].content = getNewContent('test');
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );

      await synchronizer.pull(true);

      expect(space.getRowCount(SpaceTables.Annotations)).toBe(1);
      expect(space.hasRow(SpaceTables.Annotations, notes[0].id));
      expect(
        spaceDocContent.getCell(
          SpaceDocContentTables.AnnotationContent,
          notes[0].id,
          'plainText'
        )
      ).toBe('test');
    });

    it('should pull updated notes and fill plainText', async () => {
      const items = [oneNotebook(), oneDocument()];
      const notes = [oneNote(items[1].id!), oneNote(items[1].id!)];
      notes[0].content = getNewContent('test');
      notes[1].content = getNewContent('other test');
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);

      // update on remote again
      notes[0].content = getNewContent('test 2');
      notes[0].content_meta = setMetaField(Date.now());
      notes[0].updatedAt = Date.now();
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );

      await synchronizer.sync();

      expect(space.getRowCount(SpaceTables.Annotations)).toBe(2);
      expect(
        space.hasRow(SpaceTables.Annotations, getDerivedId('a', notes[0].id))
      );
      expect(
        space.hasRow(SpaceTables.Annotations, getDerivedId('a', notes[1].id))
      );
      expect(
        spaceDocContent.getCell(
          SpaceDocContentTables.AnnotationContent,
          notes[0].id,
          'plainText'
        )
      ).toBe('test 2');
      expect(
        spaceDocContent.getCell(
          SpaceDocContentTables.AnnotationContent,
          notes[1].id,
          'plainText'
        )
      ).toBe('other test');
    });
  });

  describe('should merge user preferences', () => {
    it('should not push default user prefs', async () => {
      await synchronizer.sync();
      {
        const { userPrefs: prefs } = driver.getParsedCollectionContent();
        expect(Object.keys(prefs)).toHaveLength(0);
      }
    });

    it('should push changed user prefs', async () => {
      userPrefs.set('defaultSortBy', 'manual');
      await synchronizer.sync();
      {
        const { userPrefs: prefs } = driver.getParsedCollectionContent();
        expect(Object.keys(prefs)).toHaveLength(1);
        expect(prefs['defaultSortBy']).toEqual({
          value: { _v: 'manual' },
          updatedAt: Date.now()
        });
      }
    });

    it('should pull other changed user prefs', async () => {
      const before = Date.now();
      userPrefs.set('defaultSortBy', 'manual');
      vi.advanceTimersByTime(100);
      const items = [oneNotebook(), oneDocument()];
      const remotePrefs = [
        { id: 'maxHistoryPerDoc', value: { _v: 127 }, updatedAt: Date.now() }
      ];
      await driver.setCollectionContentWithPrefs(
        items,
        remotePrefs,
        remotePrefs[0].updatedAt
      );
      vi.advanceTimersByTime(100);
      await synchronizer.sync();

      const { userPrefs: prefs } = driver.getParsedCollectionContent();
      expect(Object.keys(prefs)).toHaveLength(2);
      expect(prefs['defaultSortBy']).toEqual({
        value: { _v: 'manual' },
        updatedAt: before
      });
      expect(prefs['maxHistoryPerDoc']).toEqual({
        value: { _v: 127 },
        updatedAt: remotePrefs[0].updatedAt
      });

      expect(userPrefs.get('defaultSortBy')).toBe('manual');
      expect(userPrefs.get('maxHistoryPerDoc')).toBe(127);
    });

    it('should merge changed user prefs (local wins)', async () => {
      const before = Date.now();
      userPrefs.set('defaultSortBy', 'manual');
      vi.advanceTimersByTime(100);
      const items = [oneNotebook(), oneDocument()];
      const remotePrefs = [
        { id: 'defaultSortBy', value: { _v: 'order' }, updatedAt: Date.now() }
      ];
      await driver.setCollectionContentWithPrefs(
        items,
        remotePrefs,
        remotePrefs[0].updatedAt
      );
      vi.advanceTimersByTime(100);
      await synchronizer.sync();

      const { userPrefs: prefs } = driver.getParsedCollectionContent();
      expect(Object.keys(prefs)).toHaveLength(1);
      expect(prefs['defaultSortBy']).toEqual({
        value: { _v: 'manual' },
        updatedAt: before
      });

      expect(userPrefs.get('defaultSortBy')).toBe('manual');
    });

    it('should merge changed user prefs (local wins 2)', async () => {
      const items = [oneNotebook(), oneDocument()];
      const remotePrefs = [
        { id: 'defaultSortBy', value: { _v: 'order' }, updatedAt: Date.now() }
      ];
      await driver.setCollectionContentWithPrefs(
        items,
        remotePrefs,
        remotePrefs[0].updatedAt
      );
      vi.advanceTimersByTime(100);

      const local = Date.now();
      userPrefs.set('defaultSortBy', 'manual');
      vi.advanceTimersByTime(100);

      await synchronizer.sync();

      const { userPrefs: prefs } = driver.getParsedCollectionContent();
      expect(Object.keys(prefs)).toHaveLength(1);
      expect(prefs['defaultSortBy']).toEqual({
        value: { _v: 'manual' },
        updatedAt: local
      });

      expect(userPrefs.get('defaultSortBy')).toBe('manual');
    });
  });

  describe('should propagate conflicts', () => {
    beforeEach(() => {
      conflictsService.initConflictQueries();
    });
    afterEach(() => {
      conflictsService.closeConflictQueries();
    });

    it('should include documents with conflicts and their source in fetchItemsQuery with onlyConflicts=true', async () => {
      const items = [oneNotebook(), oneDocument()];
      const docId = items[1].id!;
      await driver.setCollectionContent(items, items[1].updatedAt);
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // note pulled

      // update locally
      adv(() => {
        collectionService.setItemLexicalContent(
          docId,
          JSON.parse(getNewContent('local'))
        );
      });

      // update on remote
      items[1].content = minimizeContentForStorage(
        JSON.parse(getNewContent('remote'))
      );
      items[1].content_meta = setMetaField(Date.now());
      items[1].updatedAt = Date.now();
      await driver.setCollectionContent(items, items[1].updatedAt);

      // sync
      const resp = await synchronizer.sync();
      expect(resp.didPull);
      expect(!resp.didPush);
      {
        const { items } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
        expect(collectionService.isItemConflict(docId));
      }

      {
        const { result, unmount } = wrappedRenderHook(() =>
          useSynchronizationStates()
        );
        expect(result.current.isSyncEnabled).toBe(false);
        unmount();
      }
      {
        const items = fetchBrowsableItemsQuery.getResults(
          {
            onlyConflicts: true,
            restrictType: CollectionItemType.document,
            recursive: true,
            parentId: DEFAULT_NOTEBOOK_ID
          },
          'createdAt',
          true
        );
        expect(Object.keys(items)).toHaveLength(2);
        const { result, unmount } = wrappedRenderHook(() =>
          useItemsConflictMixIn(items)
        );
        expect(result.current).toHaveLength(2);
        expect(result.current[0].hasAnnotsConflicts).toBe(false);
        expect(result.current[0].conflictId).toBe(result.current[1].id);
        expect(result.current[0].isConflict).toBe(true);
        expect(result.current[1].hasAnnotsConflicts).toBe(false);
        expect(result.current[1].conflictId).toBeUndefined();
        expect(result.current[1].isConflict).toBe(false);
        unmount();
      }
    });

    it('should include documents with conflicts in notes in fetchItemsQuery with onlyConflicts=true', async () => {
      const items = [oneNotebook(), oneDocument()];
      const notes = [oneNote(items[1].id!)];
      const docId = items[1].id!;
      const noteId = notes[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // note pulled

      // update locally
      adv(() => {
        annotsService.edit(noteId, JSON.parse(getNewContent('local')));
      });

      // update on remote
      notes[0].content = minimizeContentForStorage(
        JSON.parse(getNewContent('remote'))
      );
      notes[0].content_meta = setMetaField(Date.now());
      notes[0].updatedAt = Date.now();
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );

      // sync
      const resp = await synchronizer.sync();
      expect(resp.didPull);
      expect(!resp.didPush);
      {
        const { items, annots: newNotes } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(2);
        expect(items[docId]).toBeDefined();
        expect(Object.keys(newNotes)).toHaveLength(1);
        expect(newNotes[noteId]).toBeDefined();
        expect(newNotes[noteId].content).toBe(
          space.getCell(SpaceTables.Annotations, noteId, 'content')
        );
        expect(newNotes[noteId].content).toBe(notes[0].content);
        expect(annotsService.isConflict(noteId));
      }

      {
        const { result, unmount } = wrappedRenderHook(() =>
          useSynchronizationStates()
        );
        expect(result.current.isPrimaryConnected).toBe(false);
        unmount();
      }
      {
        const items = fetchBrowsableItemsQuery.getResults({
          onlyConflicts: true,
          restrictType: CollectionItemType.document,
          recursive: true,
          parentId: DEFAULT_NOTEBOOK_ID
        });
        expect(Object.keys(items)).toHaveLength(1);
        const { result, unmount } = wrappedRenderHook(() =>
          useItemsConflictMixIn(items)
        );
        expect(result.current).toHaveLength(1);
        expect(result.current[0].hasAnnotsConflicts).toBe(true);
        expect(result.current[0].isConflict).toBe(false);
        unmount();
      }
    });

    it('should include all kinds of conflicts and exclude other documents', async () => {
      const items = [
        oneNotebook(),
        oneDocument(),
        oneDocument(),
        oneDocument(),
        oneFolder()
      ];
      const notes = [oneNote(items[1].id!)];
      const docWithNote = items[1].id!;
      const docInConflict = items[2].id!;
      const docExcluded = items[3].id!;
      const noteId = notes[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        notes[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);

      // update locally
      adv(() => {
        annotsService.edit(noteId, JSON.parse(getNewContent('local')));
      });
      adv(() => {
        collectionService.setItemLexicalContent(
          docInConflict,
          JSON.parse(getNewContent('local'))
        );
      });

      // update on remote
      notes[0].content = minimizeContentForStorage(
        JSON.parse(getNewContent('remote'))
      );
      notes[0].content_meta = setMetaField(Date.now());
      notes[0].updatedAt = Date.now();

      vi.advanceTimersByTime(100);
      items[2].content = minimizeContentForStorage(
        JSON.parse(getNewContent('remote'))
      );
      items[2].content_meta = setMetaField(Date.now());
      items[2].updatedAt = Date.now();

      await driver.setCollectionContentWithAnnots(
        items,
        notes,
        items[2].updatedAt
      );

      // sync
      const resp = await synchronizer.sync();
      expect(resp.didPull);
      expect(!resp.didPush);
      {
        const { items, annots: newNotes } = driver.getParsedCollectionContent();
        expect(Object.keys(items)).toHaveLength(5);
        expect(items[docWithNote]).toBeDefined();
        expect(items[docInConflict]).toBeDefined();
        expect(items[docExcluded]).toBeDefined();
        expect(collectionService.isItemConflict(docInConflict));
        expect(!collectionService.isItemConflict(docWithNote));
        expect(!collectionService.isItemConflict(docExcluded));
        expect(newNotes[noteId].content).toBe(notes[0].content);
        expect(annotsService.isConflict(noteId));
      }

      {
        const { result, unmount } = wrappedRenderHook(() =>
          useSynchronizationStates()
        );
        expect(result.current.isSyncEnabled).toBe(false);
        unmount();
      }

      {
        const items = fetchBrowsableItemsQuery.getResults(
          {
            onlyConflicts: true,
            restrictType: CollectionItemType.document,
            recursive: true,
            parentId: DEFAULT_NOTEBOOK_ID
          },
          'createdAt',
          true
        );
        expect(Object.keys(items)).toHaveLength(3);
        expect(items.filter(i => i.id === docExcluded)).toHaveLength(0);
        const { result, unmount } = wrappedRenderHook(() =>
          useItemsConflictMixIn(items)
        );
        expect(result.current).toHaveLength(3);
        expect(result.current[0].conflictId).toBe(docInConflict);
        expect(result.current[0].isConflict).toBe(true);
        expect(result.current[0].hasAnnotsConflicts).toBe(false);

        expect(result.current[1].id).toBe(docInConflict);
        expect(result.current[1].conflictId).toBeUndefined();
        expect(result.current[1].isConflict).toBe(false);
        expect(result.current[1].hasAnnotsConflicts).toBe(false);

        expect(result.current[2].id).toBe(docWithNote);
        expect(result.current[2].hasAnnotsConflicts).toBe(true);
        expect(result.current[2].isConflict).toBe(false);
        unmount();
      }
    });
  });

  describe('should handle remote schema version change', () => {
    test('client on newest version cannot pull remote file without version', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now()
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.pull();
      expect(resp.success).toBe(false);
      expect(resp.didPull).toBe(true);
    });

    test('client on newest version cannot pull remote file with old version', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now(),
        _v: REMOTE_COLLECTION_SCHEMA_VERSION - 1
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.pull();
      expect(resp.success).toBe(false);
      expect(resp.didPull).toBe(true);
    });

    test('client on newest version cannot force pull remote file without version', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now()
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.pull(true);
      expect(resp.success).toBe(false);
      expect(resp.didPull).toBe(true);
    });

    test('client on newest version cannot force pull remote file with old version', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now(),
        _v: REMOTE_COLLECTION_SCHEMA_VERSION - 1
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.pull(true);
      expect(resp.success).toBe(false);
      expect(resp.didPull).toBe(true);
    });

    test('client on newest version cannot push to remote file without version', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now()
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.push();
      expect(resp.success).toBe(false);
      expect(resp.didPush).toBe(false);
    });

    test('client on newest version cannot push to remote file with old version', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now(),
        _v: REMOTE_COLLECTION_SCHEMA_VERSION - 1
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.push();
      expect(resp.success).toBe(false);
      expect(resp.didPush).toBe(false);
    });

    test('client on newest version can force push to remote file without version', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now()
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.push(true);
      expect(resp.success).toBe(true);
      expect(resp.didPush).toBe(true);

      const content = await driver.getParsedCollectionContent();
      expect(content.schemaVersion).toBe(REMOTE_COLLECTION_SCHEMA_VERSION);
    });

    test('client on newest version can force push to remote file with old version', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now(),
        _v: REMOTE_COLLECTION_SCHEMA_VERSION - 1
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.push(true);
      expect(resp.success).toBe(true);
      expect(resp.didPush).toBe(true);

      const content = await driver.getParsedCollectionContent();
      expect(content.schemaVersion).toBe(REMOTE_COLLECTION_SCHEMA_VERSION);
    });

    test('client on old version cannot pull remote file on newest version', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now(),
        _v: REMOTE_COLLECTION_SCHEMA_VERSION + 1
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.pull();
      expect(resp.success).toBe(false);
      expect(resp.didPull).toBe(true);
    });

    test('client on old version cannot force pull remote file on newest version', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now(),
        _v: REMOTE_COLLECTION_SCHEMA_VERSION + 1
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.pull(true);
      expect(resp.success).toBe(false);
      expect(resp.didPull).toBe(true);
    });

    test('client on old version cannot push remote file on newest version', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now(),
        _v: REMOTE_COLLECTION_SCHEMA_VERSION + 1
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.push();
      expect(resp.success).toBe(false);
      expect(resp.didPush).toBe(false);
    });

    // can't be helped, or I'd have to pull file even on force push
    test('client on old version can force push remote file on newest version (!!!!)', async () => {
      const remoteContent: RemoteCollectionFileContent = {
        i: [],
        u: Date.now(),
        _v: REMOTE_COLLECTION_SCHEMA_VERSION + 1
      };
      driver.setContent(remoteContent);

      const resp = await synchronizer.push(true);
      expect(resp.success).toBe(true);
      expect(resp.didPush).toBe(true);
    });
  });

  describe('should handle derived state after sync', () => {
    test('after pull derived state should be updated', async () => {
      const items = [oneNotebook(), oneDocument()];
      await driver.setCollectionContent(items, items[1].updatedAt);
      await synchronizer.sync();

      expect(
        space.getCell(SpaceTables.DerivedState, items[0].id!, 'fullPath')
      ).toEqual([DEFAULT_NOTEBOOK_ID]);
      expect(
        space.getCell(SpaceTables.DerivedState, items[1].id!, 'fullPath')
      ).toEqual([DEFAULT_NOTEBOOK_ID, items[1].id]);
    });

    test('after pull derived state of deleted rows should be updated', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const items = [oneNotebook(), oneDocument()];
      await driver.setCollectionContent(items, items[1].updatedAt);
      await synchronizer.pull(true);

      expect(collectionService.itemExists(docId)).toBe(false);
      expect(space.hasRow(SpaceTables.DerivedState, docId)).toBe(false);
      expect(
        space.getCell(SpaceTables.DerivedState, items[0].id!, 'fullPath')
      ).toEqual([DEFAULT_NOTEBOOK_ID]);
      expect(
        space.getCell(SpaceTables.DerivedState, items[1].id!, 'fullPath')
      ).toEqual([DEFAULT_NOTEBOOK_ID, items[1].id]);
    });

    test('after pull derived state of moved rows should be updated', async () => {
      const folId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      const docId = collectionService.addDocument(folId);
      await synchronizer.sync();

      const items = driver.getParsedCollectionContent().items;
      const fol2 = oneFolder();
      items[fol2.id] = fol2;
      const fol1 = items[folId];
      fol1.parentId = fol2.id;

      await driver.setCollectionContent(items, fol2.updatedAt);

      await synchronizer.sync();

      expect(
        space.getCell(SpaceTables.DerivedState, fol2.id, 'fullPath')
      ).toEqual([DEFAULT_NOTEBOOK_ID, fol2.id]);
      expect(
        space.getCell(SpaceTables.DerivedState, folId, 'fullPath')
      ).toEqual([DEFAULT_NOTEBOOK_ID, fol2.id, folId]);
      expect(
        space.getCell(SpaceTables.DerivedState, docId, 'fullPath')
      ).toEqual([DEFAULT_NOTEBOOK_ID, fol2.id, folId, docId]);
    });
  });
});
