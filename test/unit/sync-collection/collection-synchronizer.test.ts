import { setFieldMeta } from '@/collection/collection';
import { minimizeContentForStorage } from '@/common/wysiwyg/compress-file-content';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space } from '@/core/db/store';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import { RemoteResult } from '@/db/types/store-types';
import { commentsService } from '@/domain/comments/comments.service';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/local-changes/model';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import { syncService } from '@/remote-storage/sync.service';
import { CollectionSynchronizer } from '@/remote-storage/synchronizers/collection-synchronizer';
import {
  adv,
  getLocalItemConflicts,
  getNewContent,
  oneComment,
  oneDocument,
  oneNotebook
} from '@@/_setup/test.utils';
import { renderHook } from '@testing-library/react';
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
      const commentId = commentsService.addComment(docId);
      commentsService.editComment(commentId, JSON.parse(getNewContent('test')));
      await synchronizer.sync();
      {
        const { content, comments } = driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(comments).toHaveLength(1);
        expect(comments[0].id).toBe(commentId);
      }
    });

    test('synchronizer should pull comments', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      await driver.setCollectionContentWithComments(
        items,
        comments || [],
        defaultValues,
        comments[0].updatedAt
      );

      await synchronizer.sync();

      expect(space.getRowCount('comments')).toBe(1);
      expect(space.hasRow('comments', comments[0].id));
    });

    test('synchronizer should merge comments', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      const docId = items[1].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithComments(
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
      await driver.setCollectionContentWithComments(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );

      // update locally
      adv(() => {
        commentsService.editComment(
          commentId,
          JSON.parse(getNewContent('test'))
        );
      });

      // sync
      await synchronizer.sync();
      {
        const { content, comments: newComments } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(newComments).toHaveLength(1);
        expect(newComments[0].id).toBe(commentId);
        expect(newComments[0].order).toBe(2);
        expect(newComments[0].content).toBe(
          space.getCell('comments', commentId, 'content')
        );
      }
    });

    test('synchronizer should sync comments and let local win if more recent', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      const docId = items[1].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithComments(
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
      await driver.setCollectionContentWithComments(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );

      // update locally
      adv(() => {
        commentsService.editComment(
          commentId,
          JSON.parse(getNewContent('local'))
        );
      });

      // sync
      const resp = await synchronizer.sync();
      expect(resp.didPull);
      expect(resp.didPush);
      {
        const { content, comments: newComments } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(newComments).toHaveLength(1);
        expect(newComments[0].id).toBe(commentId);
        expect(newComments[0].content).toBe(
          space.getCell('comments', commentId, 'content')
        );
        expect(newComments[0].content).toBe(
          minimizeContentForStorage(JSON.parse(getNewContent('local')))
        );
        expect(!commentsService.isConflict(commentId));
      }
    });

    test('synchronizer should sync comments and create conflict', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      const docId = items[1].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithComments(
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
        commentsService.editComment(
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
      await driver.setCollectionContentWithComments(
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
        const { content, comments: newComments } =
          driver.getParsedCollectionContent();
        expect(content).toHaveLength(2);
        expect(content[1].id).toBe(docId);
        expect(newComments).toHaveLength(1);
        expect(newComments[0].id).toBe(commentId);
        expect(newComments[0].content).toBe(
          space.getCell('comments', commentId, 'content')
        );
        expect(newComments[0].content).toBe(comments[0].content);
        expect(commentsService.isConflict(commentId));
      }
      {
        const { result, unmount } = renderHook(() =>
          syncService.useIsMergeSyncEnabled()
        );
        expect(result.current).toBe(false);
        unmount();
      }
    });

    test('synchronizer should sync comments and delete orphans', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      const docId = items[1].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithComments(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // comment pulled

      // add comment locally
      const orphanId = commentsService.addComment(docId);
      vi.advanceTimersByTime(100);

      // delete doc & comment on remote
      await driver.setCollectionContentWithComments(
        [items[0]],
        [],
        defaultValues,
        Date.now()
      );

      await synchronizer.sync();

      expect(!commentsService.exists(commentId));
      expect(!commentsService.exists(orphanId));
    });

    test('synchronizer should sync comments and delete orphans 2', async () => {
      const items = [oneNotebook(), oneDocument()];
      const comments = [oneComment(items[1].id!)];
      const docId = items[1].id!;
      const commentId = comments[0].id;
      await driver.setCollectionContentWithComments(
        items,
        comments,
        defaultValues,
        comments[0].updatedAt
      );
      await synchronizer.sync();
      vi.advanceTimersByTime(100);
      // comment pulled

      // delete doc & comment on remote
      await driver.setCollectionContentWithComments(
        [items[0]],
        [],
        defaultValues,
        Date.now()
      );
      // add comment locally
      vi.advanceTimersByTime(100);
      const orphanId = commentsService.addComment(docId);

      await synchronizer.sync();

      expect(!commentsService.exists(commentId));
      expect(!commentsService.exists(orphanId));
    });
  });
});
