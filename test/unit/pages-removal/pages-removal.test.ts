import { CollectionItemType, PageResult } from '@/collection/collection';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space } from '@/core/db/store';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import { DOC_ANNOTATION_TABLE } from '@/domain/document-annotations/model';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/local-changes/model';
import { statsService } from '@/domain/stats/stats-service';
import fetchNotesQuery from '@/features/notes-ui/queries/fetchNotesQuery';
import { pageMigrationService } from '@/page-migration/page-migration.service';
import fetchDocsWithPagesQuery from '@/page-migration/queries/fetchDocsWithPagesQuery';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { adv } from '@@/_setup/test.utils';
import { describe, it, test, vi } from 'vitest';

const getNewContent = (text: string, heading?: string) => {
  if (!heading)
    return `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"${text}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;
  return `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"${heading}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"textFormat":0,"textStyle":""},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"${text}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;
};

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
      JSON.parse(getNewContent('doc content', 'actual doc title'))
    );
  });
  adv(() => {
    pageIds.push(collectionService.addPage(docId));
  });
  adv(() => {
    collectionService.setItemLexicalContent(
      pageIds[0],
      JSON.parse(
        getNewContent('page 0 content', 'actual new doc from page title')
      )
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
  newParent: string,
  useHeadings: boolean
) {
  expect(collectionService.getDocumentPages(docId)).toHaveLength(0);
  expect(collectionService.getItem(docId).order).toBe(0);
  if (!useHeadings) {
    expect(collectionService.getItemTitle(docId)).toBe('my title');
  } else {
    expect(collectionService.getItemTitle(docId)).toBe('actual doc title');
  }

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
  if (!useHeadings) {
    expect(newDoc2.title).toBe('my title (3)');
  } else {
    expect(newDoc2.title).toBe('actual new doc from page title');
  }
  expect(newDoc2.order).toBe(3);

  // localChanges created
  const localChanges = localChangesService.getLocalChanges();
  expect(
    localChanges.some(
      lc => lc.itemId === newParent && lc.change === LocalChangeType.add
    )
  );
  expect(
    localChanges.some(
      lc =>
        lc.itemId === docId &&
        lc.change === LocalChangeType.update &&
        lc.field === 'order'
    )
  );
  pageIds.forEach(pId => {
    expect(
      localChanges.some(
        lc =>
          lc.itemId === pId && lc.change === LocalChangeType.update && !lc.field
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
  if (!useHeadings) {
    expect(page0Versions[0].content).toBe(page0Versions[1].content);
  } else {
    expect(page0Versions[0].content).not.toBe(page0Versions[1].content);
  }

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

function assertNotesPostExplode(
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
  const notes = fetchNotesQuery.getResults({
    itemId: docId
  });
  expect(notes).toHaveLength(pageIds.length);
  pages.forEach(p => {
    const eqNote = notes.find(c => c.createdAt === p.created);
    expect(eqNote).toBeDefined();
    expect(eqNote?.order).toBe(p.order);
    const notePlainText = space.getCell(
      DOC_ANNOTATION_TABLE,
      eqNote!.id,
      'plainText'
    );
    expect(notePlainText).toBe(p.preview);
    const noteContent = space.getCell(
      DOC_ANNOTATION_TABLE,
      eqNote!.id,
      'content'
    );
    expect(noteContent).toBe((p as any)['content']);
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
    space.setValue('historyIdleTime', 20);
    searchAncestryService.start();
    space.setValue('statsEnabled', true);
    localChangesService.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    historyService['enabled'] = false;
    searchAncestryService.stop();
    vi.useRealTimers();
  });

  it('should explode document properly (with folder creation)', () => {
    const useHeadings = false;
    const { docId, pageIds } = createDocWithHistory();
    assertDocAndPagesExist(docId, pageIds);

    adv(() =>
      pageMigrationService.explodeToDocuments(docId, true, useHeadings)
    );

    // check what happened

    // a new folder was created
    const newParent = collectionService.getItemParent(docId);
    expect(newParent).not.toBe(DEFAULT_NOTEBOOK_ID);
    const newFolder = collectionService.getItem(newParent);
    expect(newFolder.title).toBe('my title');
    expect(newFolder.parent).toBe(DEFAULT_NOTEBOOK_ID);

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(5); // folder creation + doc update + pages updates (x3)
    assertDocsPostExplode(docId, pageIds, newParent, useHeadings);
  });

  it('should explode document properly (without folder creation)', () => {
    const useHeadings = false;
    const { docId, pageIds } = createDocWithHistory();
    assertDocAndPagesExist(docId, pageIds);

    adv(() =>
      pageMigrationService.explodeToDocuments(docId, false, useHeadings)
    );

    // check what happened
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(4); // doc update + pages updates (x3)
    assertDocsPostExplode(docId, pageIds, DEFAULT_NOTEBOOK_ID, useHeadings);
  });

  it('should explode document and take first heading of pages as title', () => {
    const { docId, pageIds } = createDocWithHistory();
    assertDocAndPagesExist(docId, pageIds);

    adv(() => pageMigrationService.explodeToDocuments(docId, false, true));

    // check what happened
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(4); // doc update + pages updates (x3)
    assertDocsPostExplode(docId, pageIds, DEFAULT_NOTEBOOK_ID, true);
  });

  it('should turn pages to notes properly', () => {
    const { docId, pageIds } = createDocWithHistory();
    assertDocAndPagesExist(docId, pageIds);

    const pages = collectionService.getDocumentPages(docId);

    adv(() => pageMigrationService.explodeToNotes(docId));

    // check what happened
    assertNotesPostExplode(docId, pageIds, pages);
    // const localChanges = localChangesService.getLocalChanges();
    // expect(localChanges).toHaveLength(4); // doc update + pages updates (x3)
  });
});

describe('fetchDocsWithPage query', () => {
  test('fetchDocsWithPages 1', () => {
    const docWithPagesId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const docWithoutId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.addPage(docWithPagesId);
    collectionService.addPage(docWithPagesId);

    const res = fetchDocsWithPagesQuery.getResults({});
    console.debug(res);
    expect(res).toHaveLength(1);
    expect(res[0].docId).toBe(docWithPagesId);
    expect(res[0].title).toBeDefined();
    expect(res[0].pagesCount).toBe(2);
  });

  test('fetchDocsWithPages 2', () => {
    const docWithPagesId1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemTitle(docWithPagesId1, 'title 1');
    const docWithPagesId2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemTitle(docWithPagesId2, 'title 2');
    collectionService.addDocument(DEFAULT_NOTEBOOK_ID);

    collectionService.addPage(docWithPagesId1);
    collectionService.addPage(docWithPagesId1);
    collectionService.addPage(docWithPagesId1);
    collectionService.addPage(docWithPagesId1);
    collectionService.addPage(docWithPagesId2);
    collectionService.addPage(docWithPagesId2);

    const res = fetchDocsWithPagesQuery.getResults({});
    console.debug(res);
    expect(res).toHaveLength(2);
    expect(res[0].docId).toBe(docWithPagesId1);
    expect(res[0].title).toBe('title 1');
    expect(res[0].pagesCount).toBe(4);
    expect(res[1].docId).toBe(docWithPagesId2);
    expect(res[1].title).toBe('title 2');
    expect(res[1].pagesCount).toBe(2);
  });

  test('fetchDocsWithPages 3', () => {
    const docWithPagesId1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemTitle(docWithPagesId1, 'title 1');
    const docWithPagesId2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemTitle(docWithPagesId2, 'title 2');
    collectionService.addDocument(DEFAULT_NOTEBOOK_ID);

    collectionService.addPage(docWithPagesId1);
    collectionService.addPage(docWithPagesId1);
    collectionService.addPage(docWithPagesId1);
    collectionService.addPage(docWithPagesId1);
    collectionService.addPage(docWithPagesId2);
    collectionService.addPage(docWithPagesId2);

    space.delRow('collection', docWithPagesId2);

    const res = fetchDocsWithPagesQuery.getResults({});
    console.debug(res);
    expect(res).toHaveLength(2);
    expect(res[0].docId).toBe(docWithPagesId1);
    expect(res[0].title).toBe('title 1');
    expect(res[0].created).toBeDefined();
    expect(res[0].pagesCount).toBe(4);
    expect(res[1].docId).toBe(docWithPagesId2);
    expect(res[1].title).toBeUndefined();
    expect(res[1].created).toBeUndefined();
    expect(res[1].pagesCount).toBe(2);
  });
});
