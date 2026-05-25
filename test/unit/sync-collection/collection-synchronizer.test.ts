import { setFieldMeta } from '@/collection/collection';
import { minimizeContentForStorage } from '@/common/wysiwyg/compress-file-content';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import { RemoteResult } from '@/db/types/store-types';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/local-changes/model';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import { CollectionSynchronizer } from '@/remote-storage/synchronizers/collection-synchronizer';
import {
  adv,
  getLocalItemConflicts,
  getNewContent
} from '@@/_setup/test.utils';
import { describe } from 'vitest';

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
