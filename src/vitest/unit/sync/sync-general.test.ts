import { CollectionItemType } from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import {
  adv,
  getRowCountInsideNotebook,
  oneDocument,
  oneFolder,
  oneNotebook
} from '@/vitest/setup/test.utils';
import {
  driver,
  getRemoteContent,
  reInitRemoteData,
  syncService_pull,
  syncService_push,
  testSyncAfterEach,
  testSyncBeforeEach
} from './test-sync.utils';

const checkHistory = (
  nbOfDocuments: number,
  expectedVersions: number | number[] = 1,
  notebook = DEFAULT_NOTEBOOK_ID
) => {
  const items = collectionService.getAllCollectionItemsRecursive(notebook, {
    by: 'title',
    descending: false
  });
  let count = 0;
  const nb = Array.isArray(expectedVersions) ? expectedVersions : [];
  const docs = items.filter(r => r.type === CollectionItemType.document);
  console.log(
    '[checkHistory] expected',
    nb,
    'got',
    docs.map(d => `{${d.title}, ${historyService.getVersions(d.id!).length}}`)
  );
  docs.forEach(doc => {
    expect(historyService.getVersions(doc.id!)).toHaveLength(
      nb.length > 0 ? nb[count] : (expectedVersions as number)
    );
    count++;
  });
  expect(count).toBe(nbOfDocuments);
};

describe(`sync general test`, () => {
  beforeEach(testSyncBeforeEach);
  afterEach(testSyncAfterEach);

  it('should do nothing on first pull if remote has nothing', async () => {
    await syncService_pull();
    expect(getRowCountInsideNotebook()).toBe(0);
    expect(storageService.getSpace().getRowCount('history')).toBe(0);
  });

  it('should pull everything on first pull if remote has content', async () => {
    await reInitRemoteData([
      oneDocument(),
      oneDocument(),
      oneFolder(),
      oneNotebook()
    ]);
    await syncService_pull();
    expect(getRowCountInsideNotebook()).toBe(3);
    checkHistory(2);
  });

  it('should pull new remote items, create newer, then push', async () => {
    const remoteData = [
      oneNotebook('n0'),
      oneDocument('r1'),
      oneDocument('r2'),
      oneFolder('r3')
    ];
    await reInitRemoteData(remoteData);
    await syncService_pull();
    expect(getRowCountInsideNotebook()).toBe(3);
    adv(() => collectionService.addFolder(DEFAULT_NOTEBOOK_ID));
    await syncService_push();
    const remoteContent = await getRemoteContent();
    expect(remoteContent.content).toHaveLength(5);
    expect(remoteContent.content.map(r => r.type)).toEqual([
      CollectionItemType.notebook,
      CollectionItemType.document,
      CollectionItemType.document,
      CollectionItemType.folder,
      CollectionItemType.folder
    ]);
    expect(remoteContent.content.map(r => r.title)).toEqual([
      getGlobalTrans().defaultNotebookName,
      'r1',
      'r2',
      'r3',
      'New folder'
    ]);
    expect(getRowCountInsideNotebook()).toBe(4);
    checkHistory(2);
  });

  it('should handle missing file info if remote has been initialized elsewhere', async () => {
    const remoteData = [
      oneNotebook('n0'),
      oneDocument('r1'),
      oneDocument('r2'),
      oneFolder('r3')
    ];
    await reInitRemoteData(remoteData);
    await syncService_pull();
    expect(getRowCountInsideNotebook()).toBe(3);
  });

  it('should create version file on first init', async () => {
    const { content } = await driver.pullFile('', 'S1');
    expect(content).toBe('0');
  });

  it('should handle reinit on network down', async () => {
    // create local item, don't sync
    adv(() => collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    // create item on remote, sync
    await reInitRemoteData([oneDocument('remote')]);
    // reinit sync after network down
    await remotesService.configureRemotes(storageService.getSpaceId());
    // now pull
    await syncService_pull();
    // both items are kept
    expect(getRowCountInsideNotebook()).toBe(2);
  });
});
