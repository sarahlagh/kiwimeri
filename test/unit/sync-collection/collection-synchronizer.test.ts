import { setFieldMeta } from '@/collection/collection';
import { minimizeContentForStorage } from '@/common/wysiwyg/compress-file-content';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space } from '@/core/db/store';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import { RemoteResult } from '@/db/types/store-types';
import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import { conflictsService } from '@/domain/conflicts/conflicts-service';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import { DOC_ANNOTATION_TABLE } from '@/domain/document-annotations/model';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/local-changes/model';
import useItemsConflictMixIn from '@/features/collection-ui/hooks/useItemsConflictMixIn';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import { syncService } from '@/remote-storage/sync.service';
import { CollectionSynchronizer } from '@/remote-storage/synchronizers/collection-synchronizer';
import { searchAncestryService } from '@/search/search-ancestry.service';
import {
  adv,
  getLocalItemConflicts,
  getNewContent,
  oneComment,
  oneDocument,
  oneFolder,
  oneNotebook,
  wrappedRenderHook
} from '@@/_setup/test.utils';
import { describe } from 'vitest';
import { defaultValues } from './test-sync.utils';

const driver = new InMemDriver();
const remoteResult: RemoteResult = {
  id: '9999',
  name: 'test',
  state: '0',
  type: 'inmem',
  connected: true,
  config: '{}',
  rank: 0
};
const synchronizer = new CollectionSynchronizer(remoteResult, driver);

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
    test('should merge restored items', async () => {
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

    test('should merge deleted then restored items in same session', async () => {
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

    test('should merge updated, deleted then restored items in same session', async () => {
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

    test('should merge updated, deleted then restored items in same session - with more recent remote updates', async () => {
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
        const { content, values } = driver.getParsedCollectionContent();
        collectionService.setUnsavedItemLexicalContent(
          content[1],
          JSON.parse(getNewContent('remote update'))
        );
        content[1].content_meta = setFieldMeta('', Date.now());
        content[1].updated = Date.now();
        driver.setCollectionContent(content, values, Date.now());
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

    test('should merge updated, deleted then restored items in same session - with less recent remote updates', async () => {
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
        const { content, values } = driver.getParsedCollectionContent();
        collectionService.setUnsavedItemLexicalContent(
          content[1],
          JSON.parse(getNewContent('remote update'))
        );
        content[1].content_meta = setFieldMeta('', Date.now());
        content[1].updated = Date.now();
        driver.setCollectionContent(content, values, Date.now());
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

    test('should merge updated, deleted then restored items in same session - with remote updates on other fields', async () => {
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
        const { content, values } = driver.getParsedCollectionContent();
        content[1].title = 'remote title';
        content[1].title_meta = setFieldMeta('', Date.now());
        content[1].updated = Date.now();
        driver.setCollectionContent(content, values, Date.now());
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

  describe('should merge comments', () => {
    test('synchronizer should push comments', async () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const commentId = docAnnotationsService.addComment(docId);
      docAnnotationsService.editComment(
        commentId,
        JSON.parse(getNewContent('test'))
      );
      await synchronizer.sync();
      {
        const { content, annots: comments } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(comments).toHaveLength(1);
        expect(comments[0].id).toBe(commentId);
      }
    });

    test('synchronizer should pull comments', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      await driver.setCollectionContentWithAnnots(
        items,
        comments || [],
        defaultValues,
        comments[0].updatedAt
      );

      await synchronizer.sync();

      expect(space.getRowCount(DOC_ANNOTATION_TABLE)).toBe(1);
      expect(space.hasRow(DOC_ANNOTATION_TABLE, comments[0].id));
    });

    test('synchronizer should merge comments', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      const docId = items[1].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // comment pulled

      // update on remote
      comments[0].order = 2;
      comments[0].order_meta = setFieldMeta('', Date.now());
      comments[0].updatedAt = Date.now();
      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );

      // update locally
      adv(() => {
        docAnnotationsService.editComment(
          commentId,
          JSON.parse(getNewContent('test'))
        );
      });

      // sync
      await synchronizer.sync();
      {
        const { content, annots: newComments } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(newComments).toHaveLength(1);
        expect(newComments[0].id).toBe(commentId);
        expect(newComments[0].order).toBe(2);
        expect(newComments[0].content).toBe(
          space.getCell(DOC_ANNOTATION_TABLE, commentId, 'content')
        );
      }
    });

    test('synchronizer should sync comments and let local win if more recent', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      const docId = items[1].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // comment pulled

      // update on remote
      comments[0].content = getNewContent('remote');
      comments[0].content_meta = setFieldMeta('', Date.now());
      comments[0].updatedAt = Date.now();
      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );

      // update locally
      adv(() => {
        docAnnotationsService.editComment(
          commentId,
          JSON.parse(getNewContent('local'))
        );
      });

      // sync
      const resp = await synchronizer.sync();
      expect(resp.didPull);
      expect(resp.didPush);
      {
        const { content, annots: newComments } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(newComments).toHaveLength(1);
        expect(newComments[0].id).toBe(commentId);
        expect(newComments[0].content).toBe(
          space.getCell(DOC_ANNOTATION_TABLE, commentId, 'content')
        );
        expect(newComments[0].content).toBe(
          minimizeContentForStorage(JSON.parse(getNewContent('local')))
        );
        expect(!docAnnotationsService.isConflict(commentId));
      }
    });

    test('synchronizer should sync comments and create conflict', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      const docId = items[1].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // comment pulled

      // update locally
      adv(() => {
        docAnnotationsService.editComment(
          commentId,
          JSON.parse(getNewContent('local'))
        );
      });

      // update on remote
      comments[0].content = minimizeContentForStorage(
        JSON.parse(getNewContent('remote'))
      );
      comments[0].content_meta = setFieldMeta('', Date.now());
      comments[0].updatedAt = Date.now();
      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );

      // sync
      const resp = await synchronizer.sync();
      expect(resp.didPull);
      expect(!resp.didPush);
      {
        const { content, annots: newComments } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(newComments).toHaveLength(1);
        expect(newComments[0].id).toBe(commentId);
        expect(newComments[0].content).toBe(
          space.getCell(DOC_ANNOTATION_TABLE, commentId, 'content')
        );
        expect(newComments[0].content).toBe(comments[0].content);
        expect(docAnnotationsService.isConflict(commentId));
      }
    });

    test('synchronizer should sync comments and delete orphans', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      const docId = items[1].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // comment pulled

      // add comment locally
      const orphanId = docAnnotationsService.addComment(docId);
      vi.advanceTimersByTime(100);

      // delete doc & comment on remote
      await driver.setCollectionContentWithAnnots(
        [items[0]],
        [],
        defaultValues,
        Date.now()
      );

      await synchronizer.sync();

      expect(!docAnnotationsService.exists(commentId));
      expect(!docAnnotationsService.exists(orphanId));
    });

    test('synchronizer should sync comments and delete orphans 2', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      const docId = items[1].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // comment pulled

      // delete doc & comment on remote
      await driver.setCollectionContentWithAnnots(
        [items[0]],
        [],
        defaultValues,
        Date.now()
      );
      // add comment locally
      vi.advanceTimersByTime(100);
      const orphanId = docAnnotationsService.addComment(docId);

      await synchronizer.sync();

      expect(!docAnnotationsService.exists(commentId));
      expect(!docAnnotationsService.exists(orphanId));
    });
  });

  describe('should propagate conflicts', () => {
    beforeEach(() => {
      conflictsService.initConflictQueries();
      searchAncestryService.start();
    });
    afterEach(() => {
      conflictsService.closeConflictQueries();
      searchAncestryService.stop();
    });

    test('should include documents with conflicts and their source in fetchItemsQuery with onlyConflicts=true', async () => {
      const items = [oneNotebook(), oneDocument()];
      const docId = items[1].id!;
      await driver.setCollectionContent(items, defaultValues, items[1].updated);
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // comment pulled

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
      items[1].content_meta = setFieldMeta('', Date.now());
      items[1].updated = Date.now();
      await driver.setCollectionContent(items, defaultValues, items[1].updated);

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
          syncService.useIsMergeSyncEnabled()
        );
        expect(result.current).toBe(false);
        unmount();
      }
      {
        const items = fetchItemsQuery.getResults(
          {
            onlyConflicts: true,
            onlyDocuments: true,
            recursive: true,
            parent: DEFAULT_NOTEBOOK_ID
          },
          'created',
          true
        );
        expect(items).toHaveLength(2);
        const { result, unmount } = wrappedRenderHook(() =>
          useItemsConflictMixIn(items)
        );
        expect(result.current).toHaveLength(2);
        expect(result.current[0].hasAnnotsConflicts).toBe(false);
        expect(result.current[0].conflict).toBe(result.current[1].id);
        expect(result.current[0].isConflict).toBe(true);
        expect(result.current[1].hasAnnotsConflicts).toBe(false);
        expect(result.current[1].conflict).toBeUndefined();
        expect(result.current[1].isConflict).toBe(false);
        unmount();
      }
    });

    test('should include documents with conflicts in comments in fetchItemsQuery with onlyConflicts=true', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      const docId = items[1].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // comment pulled

      // update locally
      adv(() => {
        docAnnotationsService.editComment(
          commentId,
          JSON.parse(getNewContent('local'))
        );
      });

      // update on remote
      comments[0].content = minimizeContentForStorage(
        JSON.parse(getNewContent('remote'))
      );
      comments[0].content_meta = setFieldMeta('', Date.now());
      comments[0].updatedAt = Date.now();
      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );

      // sync
      const resp = await synchronizer.sync();
      expect(resp.didPull);
      expect(!resp.didPush);
      {
        const { content, annots: newComments } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(newComments).toHaveLength(1);
        expect(newComments[0].id).toBe(commentId);
        expect(newComments[0].content).toBe(
          space.getCell(DOC_ANNOTATION_TABLE, commentId, 'content')
        );
        expect(newComments[0].content).toBe(comments[0].content);
        expect(docAnnotationsService.isConflict(commentId));
      }

      {
        const { result, unmount } = wrappedRenderHook(() =>
          syncService.useIsMergeSyncEnabled()
        );
        expect(result.current).toBe(false);
        unmount();
      }
      {
        const items = fetchItemsQuery.getResults({
          onlyConflicts: true,
          onlyDocuments: true,
          recursive: true,
          parent: DEFAULT_NOTEBOOK_ID
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

    test('should include all kinds of conflicts and exclude other documents', async () => {
      const items = [
        oneNotebook(),
        oneDocument(),
        oneDocument(),
        oneDocument(),
        oneFolder()
      ];
      const comments = [oneComment(items[1].id!)];
      const docWithComment = items[1].id!;
      const docInConflict = items[2].id!;
      const docExcluded = items[3].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);

      // update locally
      adv(() => {
        docAnnotationsService.editComment(
          commentId,
          JSON.parse(getNewContent('local'))
        );
      });
      adv(() => {
        collectionService.setItemLexicalContent(
          docInConflict,
          JSON.parse(getNewContent('local'))
        );
      });

      // update on remote
      comments[0].content = minimizeContentForStorage(
        JSON.parse(getNewContent('remote'))
      );
      comments[0].content_meta = setFieldMeta('', Date.now());
      comments[0].updatedAt = Date.now();

      vi.advanceTimersByTime(100);
      items[2].content = minimizeContentForStorage(
        JSON.parse(getNewContent('remote'))
      );
      items[2].content_meta = setFieldMeta('', Date.now());
      items[2].updated = Date.now();

      await driver.setCollectionContentWithAnnots(
        items,
        comments,
        defaultValues,
        items[2].updated
      );

      // sync
      const resp = await synchronizer.sync();
      expect(resp.didPull);
      expect(!resp.didPush);
      {
        const { content, annots: newComments } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(5);
        expect(content[1].id).toBe(docWithComment);
        expect(content[2].id).toBe(docInConflict);
        expect(content[3].id).toBe(docExcluded);
        expect(collectionService.isItemConflict(docInConflict));
        expect(!collectionService.isItemConflict(docWithComment));
        expect(!collectionService.isItemConflict(docExcluded));
        expect(newComments[0].content).toBe(comments[0].content);
        expect(docAnnotationsService.isConflict(commentId));
      }

      {
        const { result, unmount } = wrappedRenderHook(() =>
          syncService.useIsMergeSyncEnabled()
        );
        expect(result.current).toBe(false);
        unmount();
      }

      {
        const items = fetchItemsQuery.getResults(
          {
            onlyConflicts: true,
            onlyDocuments: true,
            recursive: true,
            parent: DEFAULT_NOTEBOOK_ID
          },
          'created',
          true
        );
        expect(items).toHaveLength(3);
        expect(items.filter(i => i.id === docExcluded)).toHaveLength(0);
        const { result, unmount } = wrappedRenderHook(() =>
          useItemsConflictMixIn(items)
        );
        expect(result.current).toHaveLength(3);
        expect(result.current[0].conflict).toBe(docInConflict);
        expect(result.current[0].isConflict).toBe(true);
        expect(result.current[0].hasAnnotsConflicts).toBe(false);

        expect(result.current[1].id).toBe(docInConflict);
        expect(result.current[1].conflict).toBeUndefined();
        expect(result.current[1].isConflict).toBe(false);
        expect(result.current[1].hasAnnotsConflicts).toBe(false);

        expect(result.current[2].id).toBe(docWithComment);
        expect(result.current[2].hasAnnotsConflicts).toBe(true);
        expect(result.current[2].isConflict).toBe(false);
        unmount();
      }
    });
  });
});
