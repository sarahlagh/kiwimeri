import { minimizeContentForStorage } from '@/common_to_migrate/wysiwyg/compress-file-content';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { setMetaField } from '@/core/db/types';
import collectionService from '@/db_to_migrate/collection.service';
import { CollectionItemType } from '@/domain/collection/collection';
import { getDerivedId } from '@/domain/collection/derived-content';
import { docAnnotationsService } from '@/domain/collection/doc-annotations.service';
import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import { historyService } from '@/domain/history/history.service';
import { conflictsService } from '@/domain/synchronization/conflicts/conflicts-service';
import localChangesService from '@/domain/synchronization/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/synchronization/local-changes/model';
import {
  CollectionSynchronizer,
  REMOTE_COLLECTION_SCHEMA_VERSION,
  RemoteCollectionFileContent
} from '@/domain/synchronization/merging/synchronizers/collection-synchronizer';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import useItemsConflictMixIn from '@/features/collection-ui/hooks/useItemsConflictMixIn';
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
  beforeAll(() => {
    historyService['enabled'] = true;
  });
  afterAll(() => {
    historyService['enabled'] = false;
  });
  beforeEach(async () => {
    vi.useFakeTimers();
    synchronizer.destroy();
    synchronizer.configure({ names: ['collection.json'] });
    const { connected } = await synchronizer.connect();
    expect(connected).toBe(true);
  });
  afterEach(() => {
    vi.useRealTimers();
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
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
      }

      // delete & push
      vi.advanceTimersByTime(100);
      collectionService.deleteItem(docId);
      await synchronizer.sync();
      {
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(1);
      }

      // restore
      const latest = historyService.getLatestVersion(docId);
      historyService.restoreDocumentVersion(docId, latest.id);

      // then
      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges).toHaveLength(1);
      expect(localChanges[0].change).toBe(LocalChangeType.add);
      expect(localChanges[0].itemId).toBe(docId);

      // sync
      await synchronizer.sync();
      {
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
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
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
      }

      // delete, NOT push
      vi.advanceTimersByTime(100);
      collectionService.deleteItem(docId);
      vi.advanceTimersByTime(100);

      // restore
      const latest = historyService.getLatestVersion(docId);
      historyService.restoreDocumentVersion(docId, latest.id);

      // then
      const localChanges = localChangesService.getLocalChanges();
      expect(localChanges).toHaveLength(1);
      expect(localChanges[0].change).toBe(LocalChangeType.update);
      expect(localChanges[0].itemId).toBe(docId);
      expect(localChanges[0].field).toBeUndefined();

      // sync
      await synchronizer.sync();
      {
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
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
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
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
        historyService.restoreDocumentVersion(docId, latest.id);
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
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(content[1].content).toBe(
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
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
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
        const { content } = driver.getParsedCollectionContent();
        collectionService.setUnsavedItemLexicalContent(
          content[1],
          JSON.parse(getNewContent('remote update'))
        );
        content[1].content_meta = setMetaField(Date.now());
        content[1].updatedAt = Date.now();
        driver.setCollectionContent(content, Date.now());
      }

      // delete, NOT push
      adv(() => {
        collectionService.deleteItem(docId);
      });

      // restore
      adv(() => {
        const latest = historyService.getLatestVersion(docId);
        historyService.restoreDocumentVersion(docId, latest.id);
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
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(content[1].content).toBe(
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
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
      }

      // twist: remote update
      {
        const { content } = driver.getParsedCollectionContent();
        collectionService.setUnsavedItemLexicalContent(
          content[1],
          JSON.parse(getNewContent('remote update'))
        );
        content[1].content_meta = setMetaField(Date.now());
        content[1].updatedAt = Date.now();
        driver.setCollectionContent(content, Date.now());
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
        historyService.restoreDocumentVersion(docId, latest.id);
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
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(content[1].content).toBe(
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
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
      }

      // twist: remote update on title
      {
        const { content } = driver.getParsedCollectionContent();
        content[1].title = 'remote title';
        content[1].title_meta = setMetaField(Date.now());
        content[1].updatedAt = Date.now();
        driver.setCollectionContent(content, Date.now());
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
        historyService.restoreDocumentVersion(docId, latest.id);
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
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(content[1].content).toBe(
          minimizeContentForStorage(JSON.parse(getNewContent('local update')))
        );
        expect(content[1].title).not.toBe('remote title'); // remote change lost
      }
      expect(getLocalItemConflicts()).toHaveLength(0);
    });
  });

  describe('should merge notes', () => {
    it('should push notes', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const noteId = docAnnotationsService.addNote(docId);
      docAnnotationsService.edit(noteId, JSON.parse(getNewContent('test')));
      await synchronizer.sync();
      {
        const { content, annots: notes } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(notes).toHaveLength(1);
        expect(notes[0].id).toBe(noteId);
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
        space.getCell(
          SpaceTables.DerivedContent,
          getDerivedId('a', notes[0].id),
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
        docAnnotationsService.edit(noteId, JSON.parse(getNewContent('test')));
      });

      // sync
      await synchronizer.sync();
      {
        const { content, annots: newNotes } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(newNotes).toHaveLength(1);
        expect(newNotes[0].id).toBe(noteId);
        expect(newNotes[0].order).toBe(2);
        expect(newNotes[0].content).toBe(
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
        docAnnotationsService.edit(noteId, JSON.parse(getNewContent('local')));
      });

      // sync
      const resp = await synchronizer.sync();
      expect(resp.didPull);
      expect(resp.didPush);
      {
        const { content, annots: newNotes } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(newNotes).toHaveLength(1);
        expect(newNotes[0].id).toBe(noteId);
        expect(newNotes[0].content).toBe(
          space.getCell(SpaceTables.Annotations, noteId, 'content')
        );
        expect(newNotes[0].content).toBe(
          minimizeContentForStorage(JSON.parse(getNewContent('local')))
        );
        expect(!docAnnotationsService.isConflict(noteId));
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
        docAnnotationsService.edit(noteId, JSON.parse(getNewContent('local')));
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
        const { content, annots: newNotes } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(newNotes).toHaveLength(1);
        expect(newNotes[0].id).toBe(noteId);
        expect(newNotes[0].content).toBe(
          space.getCell(SpaceTables.Annotations, noteId, 'content')
        );
        expect(newNotes[0].content).toBe(notes[0].content);
        expect(docAnnotationsService.isConflict(noteId));
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
      const orphanId = docAnnotationsService.addNote(docId);
      vi.advanceTimersByTime(100);

      // delete doc & note on remote
      await driver.setCollectionContentWithAnnots([items[0]], [], Date.now());

      await synchronizer.sync();

      expect(!docAnnotationsService.exists(noteId));
      expect(!docAnnotationsService.exists(orphanId));
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
      const orphanId = docAnnotationsService.addNote(docId);

      await synchronizer.sync();

      expect(!docAnnotationsService.exists(noteId));
      expect(!docAnnotationsService.exists(orphanId));
    });

    it('should not delete old annots on pull', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const noteId = docAnnotationsService.addNote(docId);

      const items = [oneNotebook(), oneDocument()];
      await driver.setCollectionContentWithAnnots(
        items,
        [],
        items[1].updatedAt
      );

      await synchronizer.sync();

      expect(collectionService.itemExists(docId));
      expect(collectionService.itemExists(items[1].id!));
      expect(docAnnotationsService.exists(noteId));
    });

    it('should delete old annots on force pull', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const noteId = docAnnotationsService.addNote(docId);

      const items = [oneNotebook(), oneDocument()];
      await driver.setCollectionContentWithAnnots(
        items,
        [],
        items[1].updatedAt
      );

      await synchronizer.pull(true);

      expect(!collectionService.itemExists(docId));
      expect(collectionService.itemExists(items[1].id!));
      expect(!docAnnotationsService.exists(noteId));
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
        space.getCell(
          SpaceTables.DerivedContent,
          getDerivedId('a', notes[0].id),
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
        space.getCell(
          SpaceTables.DerivedContent,
          getDerivedId('a', notes[0].id),
          'plainText'
        )
      ).toBe('test 2');
      expect(
        space.getCell(
          SpaceTables.DerivedContent,
          getDerivedId('a', notes[1].id),
          'plainText'
        )
      ).toBe('other test');
    });
  });

  describe('should merge user preferences', () => {
    it('should not push default user prefs', async () => {
      await synchronizer.sync();
      {
        const { prefs } = driver.getParsedCollectionContent();
        expect(prefs).toHaveLength(0);
      }
    });

    it('should push changed user prefs', async () => {
      userPrefs.set('defaultSortBy', 'manual');
      await synchronizer.sync();
      {
        const { prefs } = driver.getParsedCollectionContent();
        expect(prefs).toHaveLength(1);
        expect(prefs[0]).toEqual({
          id: 'defaultSortBy',
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

      const { prefs } = driver.getParsedCollectionContent();
      expect(prefs).toHaveLength(2);
      expect(prefs[0]).toEqual({
        id: 'defaultSortBy',
        value: { _v: 'manual' },
        updatedAt: before
      });
      expect(prefs[1]).toEqual({
        id: 'maxHistoryPerDoc',
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

      const { prefs } = driver.getParsedCollectionContent();
      expect(prefs).toHaveLength(1);
      expect(prefs[0]).toEqual({
        id: 'defaultSortBy',
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

      const { prefs } = driver.getParsedCollectionContent();
      expect(prefs).toHaveLength(1);
      expect(prefs[0]).toEqual({
        id: 'defaultSortBy',
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
        const { content } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
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
        const items = fetchItemsQuery.getResults(
          {
            onlyConflicts: true,
            restrictType: CollectionItemType.document,
            recursive: true,
            parentId: DEFAULT_NOTEBOOK_ID
          },
          'createdAt',
          true
        );
        expect(items).toHaveLength(2);
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
        docAnnotationsService.edit(noteId, JSON.parse(getNewContent('local')));
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
        const { content, annots: newNotes } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(newNotes).toHaveLength(1);
        expect(newNotes[0].id).toBe(noteId);
        expect(newNotes[0].content).toBe(
          space.getCell(SpaceTables.Annotations, noteId, 'content')
        );
        expect(newNotes[0].content).toBe(notes[0].content);
        expect(docAnnotationsService.isConflict(noteId));
      }

      {
        const { result, unmount } = wrappedRenderHook(() =>
          useSynchronizationStates()
        );
        expect(result.current.isPrimaryConnected).toBe(false);
        unmount();
      }
      {
        const items = fetchItemsQuery.getResults({
          onlyConflicts: true,
          restrictType: CollectionItemType.document,
          recursive: true,
          parentId: DEFAULT_NOTEBOOK_ID
        });
        expect(items).toHaveLength(1);
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
        docAnnotationsService.edit(noteId, JSON.parse(getNewContent('local')));
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
        const { content, annots: newNotes } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(5);
        expect(content[1].id).toBe(docWithNote);
        expect(content[2].id).toBe(docInConflict);
        expect(content[3].id).toBe(docExcluded);
        expect(collectionService.isItemConflict(docInConflict));
        expect(!collectionService.isItemConflict(docWithNote));
        expect(!collectionService.isItemConflict(docExcluded));
        expect(newNotes[0].content).toBe(notes[0].content);
        expect(docAnnotationsService.isConflict(noteId));
      }

      {
        const { result, unmount } = wrappedRenderHook(() =>
          useSynchronizationStates()
        );
        expect(result.current.isSyncEnabled).toBe(false);
        unmount();
      }

      {
        const items = fetchItemsQuery.getResults(
          {
            onlyConflicts: true,
            restrictType: CollectionItemType.document,
            recursive: true,
            parentId: DEFAULT_NOTEBOOK_ID
          },
          'createdAt',
          true
        );
        expect(items).toHaveLength(3);
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
      expect(content._schemaVersion).toBe(REMOTE_COLLECTION_SCHEMA_VERSION);
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
      expect(content._schemaVersion).toBe(REMOTE_COLLECTION_SCHEMA_VERSION);
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

      const items = driver.getParsedCollectionContent().content;
      const fol2 = oneFolder();
      items.push(fol2);
      const fol1 = items.find(i => i.id === folId)!;
      fol1.parentId = fol2.id;

      await driver.setCollectionContent(items, fol2.updatedAt);

      await synchronizer.sync();

      expect(
        space.getCell(SpaceTables.DerivedState, fol2.id, 'fullPath')
      ).toEqual([DEFAULT_NOTEBOOK_ID, fol2.id]);
      expect(
        space.getCell(SpaceTables.DerivedState, fol1.id, 'fullPath')
      ).toEqual([DEFAULT_NOTEBOOK_ID, fol2.id, fol1.id]);
      expect(
        space.getCell(SpaceTables.DerivedState, docId, 'fullPath')
      ).toEqual([DEFAULT_NOTEBOOK_ID, fol2.id, folId, docId]);
    });
  });
});
