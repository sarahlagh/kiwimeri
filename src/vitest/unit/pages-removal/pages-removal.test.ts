import { CollectionItemType, PageResult } from '@/collection/collection';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { getSpace } from '@/core/db/store';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import localChangesServiceV1 from '@/db/local-changes.service.v1';
import storageService from '@/db/storage.service';
import { LocalChangeTypeV1 } from '@/db/types/store-types';
import { statsService } from '@/domain/stats/stats-service';
import fetchCommentsQuery from '@/features/comments-ui/queries/fetchCommentsQuery';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { adv, getNewContent } from '@/vitest/setup/test.utils';
import { describe, it, vi } from 'vitest';

function createDocWithHistory() {
  const pageIds: string[] = [];
  const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
  adv(() => collectionService.setItemTitle(docId, 'my title'));
  adv(() => {
    pageIds.push(collectionService.addPage(docId));
  });
  adv(() => {
    collectionService.setItemLexicalContent(
      docId,
      JSON.parse(getNewContent('doc content'))
    );
  });
  adv(() => {
    pageIds.push(collectionService.addPage(docId));
  });
  adv(() => {
    collectionService.setItemLexicalContent(
      pageIds[0],
      JSON.parse(getNewContent('page 0 content'))
    );
  });
  adv(() => {
    collectionService.setItemLexicalContent(
      pageIds[1],
      JSON.parse(getNewContent('page 1 content'))
    );
  });
  adv(() => {
    pageIds.push(collectionService.addPage(docId));
  });
  adv(() => {
    collectionService.setItemLexicalContent(
      pageIds[2],
      JSON.parse(getNewContent('page 2 content'))
    );
  });
  adv(() => {
    collectionService.setItemLexicalContent(
      pageIds[1],
      JSON.parse(getNewContent('new page 1 content'))
    );
  });
  adv(() => {
    collectionService.setItemDisplayOpts(docId, {
      sort: { by: 'order', descending: false },
      statsEnabled: true
    });
  });
  adv(() => {
    const pages = collectionService.getDocumentPages(docId);
    collectionService.reorderItems(pages, 0, 2);
  });
  return { docId, pageIds };
}

function assertDocAndPagesExist(docId: string, pageIds: string[]) {
  const pages = collectionService.getDocumentPages(docId);
  expect(pages).toHaveLength(3);
  expect(pages[0].id).toBe(pageIds[1]);
  expect(pages[1].id).toBe(pageIds[2]);
  expect(pages[2].id).toBe(pageIds[0]);

  // check stats
  expect(statsService.getDataPoints(pageIds[0])).toHaveLength(1);
  expect(statsService.getDataPoints(pageIds[1])).toHaveLength(1);
  expect(statsService.getDataPoints(pageIds[2])).toHaveLength(1);

  const docVersions = historyService.getVersions(docId);
  // creation, set title, page creation x3, page set content x4, set sort, reorder
  expect(docVersions).toHaveLength(11);
  const page0Versions = historyService.getVersions(pageIds[0]);
  expect(page0Versions).toHaveLength(2);
  const page1Versions = historyService.getVersions(pageIds[1]);
  expect(page1Versions).toHaveLength(3);
  const page2Versions = historyService.getVersions(pageIds[2]);
  expect(page2Versions).toHaveLength(2);
}

function assertDocsPostExplode(
  docId: string,
  pageIds: string[],
  newParent: string
) {
  expect(collectionService.getDocumentPages(docId)).toHaveLength(0);
  expect(collectionService.getItem(docId).order).toBe(0);

  // pages were converted
  pageIds.forEach(pId => {
    expect(collectionService.itemExists(pId));
    expect(collectionService.getItemType(pId)).toBe(
      CollectionItemType.document
    );
    expect(collectionService.getItemParent(pId)).toBe(newParent);
  });
  const newDoc0 = collectionService.getItem(pageIds[1]);
  expect(newDoc0.title).toBe('my title (1)');
  expect(newDoc0.order).toBe(1);
  const newDoc1 = collectionService.getItem(pageIds[2]);
  expect(newDoc1.title).toBe('my title (2)');
  expect(newDoc1.order).toBe(2);
  const newDoc2 = collectionService.getItem(pageIds[0]);
  expect(newDoc2.title).toBe('my title (3)');
  expect(newDoc2.order).toBe(3);

  // localChanges created
  const localChanges = localChangesServiceV1.getLocalChanges();
  expect(
    localChanges.some(
      lc => lc.item === newParent && lc.change === LocalChangeTypeV1.add
    )
  );
  expect(
    localChanges.some(
      lc =>
        lc.item === docId &&
        lc.change === LocalChangeTypeV1.update &&
        lc.field === 'order'
    )
  );
  pageIds.forEach(pId => {
    expect(
      localChanges.some(
        lc =>
          lc.item === pId && lc.change === LocalChangeTypeV1.update && !lc.field
      )
    );
  });

  // stats followed pages
  expect(statsService.getDataPoints(pageIds[0])).toHaveLength(1);
  expect(statsService.getDataPoints(pageIds[1])).toHaveLength(1);
  expect(statsService.getDataPoints(pageIds[2])).toHaveLength(1);

  // document history was updated
  const docVersions = historyService.getVersions(docId);
  expect(docVersions).toHaveLength(12); // + 1
  expect(docVersions[0].pageVersionsArrayJson).toBeUndefined();
  expect(docVersions[0].snapshotJson.order).toBe(0);
  expect(docVersions[1].pageVersionsArrayJson).toHaveLength(3);

  // versions followed pages
  const page0Versions = historyService.getVersions(pageIds[0]);
  expect(page0Versions).toHaveLength(3); // + 1
  expect(page0Versions[0].content).toBe(page0Versions[1].content);
  expect(page0Versions[0].pageVersionsArrayJson).toBeUndefined();
  expect(page0Versions[0].snapshotJson.parent).toBe(newParent);
  const page1Versions = historyService.getVersions(pageIds[1]);
  expect(page1Versions).toHaveLength(4); // + 1
  expect(page1Versions[0].content).toBe(page1Versions[1].content);
  expect(page1Versions[0].pageVersionsArrayJson).toBeUndefined();
  expect(page1Versions[0].snapshotJson.parent).toBe(newParent);
  const page2Versions = historyService.getVersions(pageIds[2]);
  expect(page2Versions).toHaveLength(3); // + 1
  expect(page2Versions[0].content).toBe(page2Versions[1].content);
  expect(page2Versions[0].pageVersionsArrayJson).toBeUndefined();
  expect(page2Versions[0].snapshotJson.parent).toBe(newParent);
}

function assertCommentsPostExplode(
  docId: string,
  pageIds: string[],
  pages: PageResult[]
) {
  expect(collectionService.itemExists(docId));
  expect(collectionService.getDocumentPages(docId)).toHaveLength(0);
  pageIds.forEach(p => {
    // pages were deleted
    expect(!collectionService.itemExists(p));
  });
  const comments = fetchCommentsQuery.getResults({
    itemId: docId
  });
  expect(comments).toHaveLength(pageIds.length);
  pages.forEach(p => {
    const eqComment = comments.find(c => c.createdAt === p.created);
    expect(eqComment).toBeDefined();
    expect(eqComment?.order).toBe(p.order);
    const commentPlainText = getSpace().getCell(
      'comments',
      eqComment!.id,
      'plainText'
    );
    expect(commentPlainText).toBe(p.preview);
    const commentContent = getSpace().getCell(
      'comments',
      eqComment!.id,
      'content'
    );
    expect(commentContent).toBe((p as any)['content']);
  });

  // document sort was updated
  const display_opts = collectionService.getItemDisplayOpts(docId);
  expect(display_opts).toBeDefined();
  expect(display_opts!.documentSort).toEqual({
    by: 'order',
    descending: false
  });
  expect(display_opts!.sort).toBeDefined();

  // stats were deleted
  expect(statsService.getDataPoints(pageIds[0])).toHaveLength(0);
  expect(statsService.getDataPoints(pageIds[1])).toHaveLength(0);
  expect(statsService.getDataPoints(pageIds[2])).toHaveLength(0);

  // document history was updated
  const docVersions = historyService.getVersions(docId);
  expect(docVersions).toHaveLength(12); // + 1
  expect(docVersions[0].pageVersionsArrayJson).toBeUndefined();
  expect(docVersions[1].pageVersionsArrayJson).toBeUndefined(); // pages were deleted from older versions too

  // page versions were deleted
  expect(historyService.getVersions(pageIds[0])).toHaveLength(0);
  expect(historyService.getVersions(pageIds[1])).toHaveLength(0);
  expect(historyService.getVersions(pageIds[2])).toHaveLength(0);
}

describe('page removal test', () => {
  beforeEach(() => {
    historyService['enabled'] = true;
    storageService.getSpace().setValue('historyIdleTime', 20);
    searchAncestryService.start();
    storageService.getSpace().setValue('statsEnabled', true);
    localChangesServiceV1.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    historyService['enabled'] = false;
    searchAncestryService.stop();
    vi.useRealTimers();
  });

  it('should explode document properly (with folder creation)', () => {
    const { docId, pageIds } = createDocWithHistory();
    assertDocAndPagesExist(docId, pageIds);

    adv(() => collectionService.explodeToDocuments(docId, true));

    // check what happened

    // a new folder was created
    const newParent = collectionService.getItemParent(docId);
    expect(newParent).not.toBe(DEFAULT_NOTEBOOK_ID);
    const newFolder = collectionService.getItem(newParent);
    expect(newFolder.title).toBe('my title');
    expect(newFolder.parent).toBe(DEFAULT_NOTEBOOK_ID);

    const localChanges = localChangesServiceV1.getLocalChanges();
    expect(localChanges).toHaveLength(5); // folder creation + doc update + pages updates (x3)
    assertDocsPostExplode(docId, pageIds, newParent);
  });

  it('should explode document properly (without folder creation)', () => {
    const { docId, pageIds } = createDocWithHistory();
    assertDocAndPagesExist(docId, pageIds);

    adv(() => collectionService.explodeToDocuments(docId, false));

    // check what happened
    const localChanges = localChangesServiceV1.getLocalChanges();
    expect(localChanges).toHaveLength(4); // doc update + pages updates (x3)
    assertDocsPostExplode(docId, pageIds, DEFAULT_NOTEBOOK_ID);
  });

  it('should turn pages to comments properly', () => {
    const { docId, pageIds } = createDocWithHistory();
    assertDocAndPagesExist(docId, pageIds);

    const pages = collectionService.getDocumentPages(docId);

    adv(() => collectionService.explodeToComments(docId));

    // check what happened
    assertCommentsPostExplode(docId, pageIds, pages);
    // const localChanges = localChangesService.getLocalChanges();
    // expect(localChanges).toHaveLength(4); // doc update + pages updates (x3)
  });
});
