import {
  CollectionItem,
  CollectionItemSnapshotData,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemVersion,
  CollectionItemVersionContentRow,
  CollectionItemVersionOp,
  CollectionItemVersionRow,
  CollectionPageVersionData,
  PageResult,
  setFieldMeta
} from '@/collection/collection';
import { AfterSyncHistChange } from '@/remote-storage/sync-types';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { getHash, Id, ResultRow } from 'tinybase/with-schemas';
import collectionService from './collection.service';
import storageService from './storage.service';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useRowWithRef
} from './tinybase/hooks';
import { LocalChangeType } from './types/store-types';
import userSettingsService from './user-settings.service';

type VersionsWithContentResult = ResultRow & {
  op: CollectionItemVersionOp;
  itemId: string;
  createdAt: number;
  snapshotJson: string;
  pageVersionsArrayJson?: string;
  content: string;
  preview: string;
  hash: number;
  rank: number;
  virtualOrder?: number; // order calculated from the params, if array
};

type VersionsWithContentParam = {
  itemId: Id;
  createdAt?: number;
};

const defaultSort = { by: 'createdAt', descending: true };
const pagesSort = { by: 'virtualOrder', descending: false };

class CollectionHistoryService {
  private enabled = true;
  private readonly storeId = 'space';
  private readonly tableId = 'history';
  private readonly contentTableId = 'history_content';
  private timeouts = new Map<string, NodeJS.Timeout>();

  private useVersionedPagesQuery = 'PageVersionsWithContent';

  private buildVersionsWithContentQuery(
    params: VersionsWithContentParam | VersionsWithContentParam[],
    latest: boolean,
    space?: string
  ) {
    const queries = storageService.getSpaceQueries(space);
    let i = 0;
    const mainQueryName = 'GetVersionsWithContent';
    while (queries.hasQuery(`${mainQueryName}${i}`)) i++;
    const queryName = `${mainQueryName}${i}`;
    const itemId = Array.isArray(params) ? '' : params.itemId;
    const createdAt = Array.isArray(params) ? 0 : params.createdAt || 0;
    const paramArray = Array.isArray(params) ? JSON.stringify(params) : '';
    queries.setQueryDefinition(
      queryName,
      'history',
      ({ select, where, param, join }) => {
        select('op');
        select('itemId');
        select('createdAt');
        select('rank');
        select('snapshotJson');
        select('pageVersionsArrayJson');
        select('contentData', 'content');
        select('contentData', 'preview');
        select('contentData', 'hash');
        join('history_content', 'contentId').as('contentData');

        if (param('latest') === true) {
          where('rank', 0);
        }

        if (param('paramArray') && param('paramArray')!.toString().length > 0) {
          select(getTableCell => {
            const params = JSON.parse(
              param('paramArray')!.toString()
            ) as VersionsWithContentParam[];
            const itemId = getTableCell('itemId') as string;
            return params.findIndex(p => p.itemId === itemId);
          }).as('virtualOrder'); // for sorting

          where(getCell => {
            const params = JSON.parse(
              param('paramArray')!.toString()
            ) as VersionsWithContentParam[];
            const itemId = getCell('itemId') as string;
            const createdAt = getCell('createdAt') as number;
            const paramByItemId = params.find(p => p.itemId === itemId);
            if (paramByItemId?.createdAt && paramByItemId.createdAt !== 0) {
              return paramByItemId.createdAt === createdAt;
            }
            return paramByItemId !== undefined;
          });
        }

        if (param('itemId') && param('itemId')!.toString().length > 0) {
          where('itemId', param('itemId') as string);
          if (param('createdAt') && param('createdAt') !== 0) {
            where('createdAt', param('createdAt') as string);
          }
        }
      },
      {
        itemId,
        createdAt,
        paramArray,
        latest
      }
    );
    return queryName;
  }

  private buildContentByHashQuery(hash: number, space?: string) {
    const mainQueryName = 'ContentByHash';
    const queries = storageService.getSpaceQueries(space);
    let i = 0;
    while (queries.hasQuery(`${mainQueryName}${i}`)) i++;
    const queryName = `${mainQueryName}${i}`;
    queries.setQueryDefinition(
      queryName,
      this.contentTableId,
      ({ select, where, param }) => {
        select('hash');
        select('content');
        select('preview');
        where('hash', param('hash') as string);
      },
      { hash }
    );
    return queryName;
  }

  private buildVersionsGCQuery(maxPerDoc: number, space?: string) {
    const queries = storageService.getSpaceQueries(space);
    const queryName = 'GetVersionsForGC';
    queries.setQueryDefinition(
      queryName,
      'history',
      ({ select, where, param }) => {
        select('rank');
        select('contentId');
        where(getCell => {
          const maxPerDocParam = param('maxPerDoc')?.valueOf() as number;
          return (getCell('rank')?.valueOf() as number) >= maxPerDocParam;
        });
      },
      { maxPerDoc }
    );
    return queryName;
  }

  private buildContentGCQuery(contentId: string, space?: string) {
    const mainQueryName = 'ContentById';
    const queries = storageService.getSpaceQueries(space);
    let i = 0;
    while (queries.hasQuery(`${mainQueryName}${i}`)) i++;
    const queryName = `${mainQueryName}${i}`;
    queries.setQueryDefinition(
      queryName,
      'history',
      ({ select, where, param }) => {
        select('contentId');
        where('contentId', param('contentId') as string);
      },
      { contentId }
    );
    return queryName;
  }

  public start(space?: string) {
    this.useVersionedPagesQuery = this.buildVersionsWithContentQuery(
      [],
      true,
      space
    );
  }

  private setVersionsWithContentQueryParams(
    queryName: string,
    params: VersionsWithContentParam | VersionsWithContentParam[]
  ) {
    const itemId = Array.isArray(params) ? '' : params.itemId;
    const createdAt = Array.isArray(params) ? 0 : params.createdAt || 0;
    const paramArray = Array.isArray(params) ? JSON.stringify(params) : '';
    storageService
      .getSpaceQueries()
      .setParamValue(queryName, 'itemId', itemId)
      .setParamValue(queryName, 'createdAt', createdAt)
      .setParamValue(queryName, 'paramArray', paramArray);
  }

  private mapToCollectionItemVersion(
    rowId: string,
    resultRow: VersionsWithContentResult
  ) {
    const version: CollectionItemVersion = {
      id: rowId,
      op: resultRow.op,
      createdAt: resultRow.createdAt,
      itemId: resultRow.itemId,
      snapshotJson: JSON.parse(resultRow.snapshotJson),
      content: resultRow.content,
      preview: resultRow.preview,
      hash: resultRow.hash,
      rank: resultRow.rank
    };
    if (resultRow.pageVersionsArrayJson) {
      version.pageVersionsArrayJson = JSON.parse(
        resultRow.pageVersionsArrayJson
      );
    }
    return version;
  }

  private getResults(queryName: string, sort = defaultSort) {
    return storageService
      .getSpaceQueries()
      .getResultSortedRowIds(queryName, sort.by, sort.descending);
  }

  private useResults(queryName: string, sort = defaultSort) {
    return useResultSortedRowIdsWithRef(
      this.storeId,
      queryName,
      sort.by,
      sort.descending
    );
  }

  public searchVersions(
    params: VersionsWithContentParam | VersionsWithContentParam[],
    limit?: number
  ): CollectionItemVersion[] {
    let sort = defaultSort;
    if (Array.isArray(params)) sort = pagesSort;
    return this._search(params, sort, false, 0, limit);
  }

  public searchLatestVersions(
    params: VersionsWithContentParam[]
  ): CollectionItemVersion[] {
    return this._search(params, pagesSort, true);
  }

  private _search(
    params: VersionsWithContentParam | VersionsWithContentParam[],
    sort: { by: string; descending: boolean },
    latest = false,
    offset?: number,
    limit?: number
  ) {
    const queries = storageService.getSpaceQueries();
    const queryName = this.buildVersionsWithContentQuery(params, latest);
    const results = queries
      .getResultSortedRowIds(queryName, sort.by, sort.descending, offset, limit)
      .map(rowId => {
        const resultRow = queries.getResultRow(
          queryName,
          rowId
        ) as VersionsWithContentResult;
        return this.mapToCollectionItemVersion(rowId, resultRow);
      });
    queries.delQueryDefinition(queryName);
    return results;
  }

  public getVersions(itemId: string, limit?: number): CollectionItemVersion[] {
    return this.searchVersions({ itemId }, limit);
  }

  public getLatestVersion(itemId: string) {
    return this.getVersions(itemId, 1)[0];
  }

  public getVersion(versionId: string) {
    const space = storageService.getSpace();
    const pageRow = space.getRow(
      this.tableId,
      versionId
    ) as CollectionItemVersionRow;
    const contentRow = space.getRow(
      this.contentTableId,
      pageRow?.contentId || ''
    ) as CollectionItemVersionContentRow;
    if (!pageRow || !contentRow) return undefined;
    return this.mapToVersion(versionId, pageRow, contentRow);
  }

  public useVersion(versionId: string) {
    const pageRow = useRowWithRef<CollectionItemVersionRow>(
      this.storeId,
      this.tableId,
      versionId
    );
    const contentRow = useRowWithRef<CollectionItemVersionContentRow>(
      this.storeId,
      this.contentTableId,
      pageRow?.contentId || ''
    );
    if (!pageRow || !contentRow) return undefined;
    return this.mapToVersion(versionId, pageRow, contentRow);
  }

  private mapToVersion(
    rowId: string,
    versionRow: CollectionItemVersionRow,
    contentRow?: CollectionItemVersionContentRow
  ): CollectionItemVersion {
    return {
      id: rowId,
      op: versionRow.op,
      createdAt: versionRow.createdAt,
      itemId: versionRow.itemId,
      snapshotJson: JSON.parse(versionRow.snapshotJson),
      pageVersionsArrayJson: versionRow.pageVersionsArrayJson
        ? JSON.parse(versionRow.pageVersionsArrayJson)
        : undefined,
      content: contentRow?.content || '',
      preview: contentRow?.preview || '',
      hash: contentRow?.hash || 0,
      rank: versionRow.rank
    };
  }

  public useDocumentVersionedPages(
    docId: string,
    docVersionId?: string
  ): PageResult[] {
    const queries = storageService.getSpaceQueries();
    const rawPageVersions = useCellWithRef<string>(
      this.storeId,
      this.tableId,
      docVersionId || 'null',
      'pageVersionsArrayJson'
    );
    let pageVersions: CollectionPageVersionData[] = [];
    if (rawPageVersions) {
      pageVersions = JSON.parse(rawPageVersions);
    }
    const queryName = this.useVersionedPagesQuery;
    this.setVersionsWithContentQueryParams(queryName, pageVersions);
    const pageResults = this.useResults(queryName, pagesSort).map(rowId => {
      const resultRow = queries.getResultRow(
        queryName,
        rowId
      ) as VersionsWithContentResult;
      return this.mapToCollectionItemVersion(rowId, resultRow);
    });
    return pageResults.map(pageVersion => {
      const pageResult: PageResult = {
        id: pageVersion.itemId,
        type: CollectionItemType.page,
        parent: docId,
        ...pageVersion.snapshotJson,
        order: pageVersion.snapshotJson.order!,
        preview: pageVersion.preview || ''
      };
      return pageResult;
    });
  }

  public getPagesForVersion(docVersionId: string): CollectionItemVersion[] {
    const rawPageVersions = storageService
      .getSpace()
      .getCell(this.tableId, docVersionId, 'pageVersionsArrayJson');
    if (!rawPageVersions) return [];
    let pageVersions: CollectionPageVersionData[] = [];
    if (rawPageVersions) {
      pageVersions = JSON.parse(rawPageVersions.toString());
    }
    return this.searchVersions(pageVersions);
  }

  // TODO later: check version snapshot (don't create duplicates)
  public addVersion(id: string, sync = false) {
    if (!this.enabled) return;
    if (sync) {
      this.flushVersion(id);
      return;
    }

    const now = Date.now();
    const idleDelay = userSettingsService.getHistoryIdleTime();
    const maxInterval = userSettingsService.getHistoryMaxInterval();

    const existingTimeout = this.timeouts.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const lastVersion = this.getLatestVersion(id)?.createdAt || null;

    // force periodic checkpoint during long continuous writing
    if (lastVersion != null && now - lastVersion >= maxInterval) {
      this.flushVersion(id);
      return;
    }

    const timeout = setTimeout(() => {
      const lastChange = collectionService.getItem(id)?.updated || 0;
      if (lastChange == null) {
        this.timeouts.delete(id);
        return;
      }

      const idleFor = Date.now() - lastChange;
      if (idleFor >= idleDelay) {
        this.flushVersion(id);
      } else {
        this.addVersion(id); // reschedule
      }
    }, idleDelay);

    this.timeouts.set(id, timeout);
  }

  public flushVersion(id: string) {
    const existingTimeout = this.timeouts.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.timeouts.delete(id);
    }
    this.saveVersionSync(id);
  }

  public versionExists(id: string) {
    return storageService.getSpace().hasRow(this.tableId, id);
  }

  public isCurrentVersion(docId: string, versionId: string) {
    const space = storageService.getSpace();
    const itemLastUpdated = space.getCell('collection', docId, 'updated');
    const versionCreated = space.getCell(this.tableId, versionId, 'createdAt');
    return itemLastUpdated === versionCreated;
  }

  public restoreDocumentVersion(docId: string, versionId: string) {
    this.saveNow();
    const version = this.getVersion(versionId);
    if (!version) return;

    // handle pages first
    const pagesCurrent = collectionService.getDocumentPages(docId);
    const pagesAtVersion = this.getPagesForVersion(versionId);
    const pageIdsCurrent = pagesCurrent.map(p => p.id);
    const pageIdsAtVersion = pagesAtVersion.map(p => p.itemId);
    const uniqueIds = [...new Set([...pageIdsCurrent, ...pageIdsAtVersion])];
    // must delete non-existant pages in old version
    const pagesToDelete = uniqueIds.filter(
      id => !pageIdsAtVersion.includes(id) && pageIdsCurrent.includes(id)
    );
    // must recreate or update the others
    const pagesToUpdate = uniqueIds.filter(id => pageIdsAtVersion.includes(id));
    const space = storageService.getSpace();
    pagesToDelete.forEach(pId => {
      // bypass collectionService - don't want to delete versions
      // TODO how about local changes / sync
      space.delRow('collection', pId);
    });

    const now = Date.now();
    pagesToUpdate.forEach(pId => {
      const pageVersion = pagesAtVersion.find(p => p.itemId === pId)!;
      const recreatedPage: CollectionItem = {
        ...pageVersion.snapshotJson,
        type: CollectionItemType.page,
        parent: docId,
        parent_meta: setFieldMeta(docId, pageVersion.snapshotJson.created),
        content: pageVersion.content,
        updated: now,
        order: pageVersion.snapshotJson.order!,
        order_meta: pageVersion.snapshotJson.order_meta!
      };
      // bypass collection service to save a single page version
      space.setRow('collection', pId, recreatedPage);
      this.saveSingleVersion({ ...recreatedPage, id: pId }, 'snapshot'); // add type 'restored'?
      // TODO how about local changes / sync
    });

    // copy version data to current collection item
    const current = space.getRow('collection', docId) as CollectionItem;
    collectionService.saveItem(
      {
        ...current,
        ...version.snapshotJson,
        content: version.content,
        updated: Date.now()
      },
      docId
    );
  }

  public restorePageVersion(pageId: string, versionId: string) {
    this.saveNow();
    const version = this.getVersions(pageId).find(v => v.id === versionId);
    if (!version) return;
    // copy version data to current collection item
    const current = storageService
      .getSpace()
      .getRow('collection', pageId) as CollectionItem;
    collectionService.saveItem(
      {
        ...current,
        ...version.snapshotJson,
        content: version.content,
        updated: Date.now()
      },
      pageId
    );
  }

  private buildVersionData(item: CollectionItem) {
    const data: CollectionItemSnapshotData = {
      title: item.title,
      title_meta: item.title_meta,
      content_meta: item.content_meta,
      tags: item.tags,
      tags_meta: item.tags_meta,
      deleted: item.deleted,
      deleted_meta: item.deleted_meta,
      display_opts: item.display_opts,
      display_opts_meta: item.display_opts_meta,
      created: item.created,
      updated: item.updated
    };
    if (item.type === CollectionItemType.page) {
      data.order = item.order;
      data.order_meta = item.order_meta;
    }
    return JSON.stringify(data);
  }

  public saveVersionFromItem(item: CollectionItem, skipPages: string[] = []) {
    if (!this.enabled) return;
    console.debug(
      '[history] saving new version for item',
      item.id,
      item.type,
      skipPages
    );
    const space = storageService.getSpace();
    const versionId = this.saveSingleVersion(item, 'snapshot');
    if (item.type === CollectionItemType.page) {
      // if page, add document version too, and relation to document
      const parentDoc = space.getRow(
        'collection',
        item.parent
      ) as CollectionItem;
      this.saveVersionFromItem(
        {
          ...parentDoc,
          id: item.parent,
          updated: item.updated
        },
        skipPages
      );
    } else if (item.type === CollectionItemType.document) {
      this.setPageVersions(item.id!, versionId!, skipPages);
    }
    return versionId;
  }

  private saveSingleVersion(item: CollectionItem, op: CollectionItemVersionOp) {
    const space = storageService.getSpace();
    let versionId: string | undefined;
    space.transaction(() => {
      // must update previous ranks - not ideal, but needed for the get latest pages query
      const versions = this.getVersions(item.id!);
      versions.forEach(v => {
        const previousRank = space.getCell('history', v.id, 'rank') as number;
        space.setCell('history', v.id, 'rank', previousRank + 1);
      });
      const { contentId } = this.getOrCreatedContentId(item);
      versionId = space.addRow(this.tableId, {
        op,
        itemId: item.id,
        createdAt: item.updated,
        snapshotJson: this.buildVersionData(item),
        contentId,
        rank: 0
      });
    });
    return versionId;
  }

  private getOrCreatedContentId(item: Pick<CollectionItem, 'id' | 'content'>) {
    const space = storageService.getSpace();
    const queries = storageService.getSpaceQueries();
    const contentHash = getHash(item.id! + item.content || '');
    const queryName = this.buildContentByHashQuery(contentHash);
    const results = this.getResults(queryName);
    queries.delQueryDefinition(queryName);
    if (results.length > 0) {
      return { contentHash, contentId: results[0] };
    }
    return {
      contentHash,
      contentId: space.addRow(this.contentTableId, {
        content: item.content || '',
        preview: searchAncestryService.getUnsavedItemPreview(item),
        hash: contentHash
      })
    };
  }

  private setPageVersions(
    docId: string,
    docVersionId: string,
    skipPages: string[] = []
  ) {
    const pageIds = collectionService
      .getDocumentPages(docId)
      .map(p => ({ itemId: p.id }))
      .filter(p => !skipPages.includes(p.itemId));
    if (pageIds.length === 0) return;
    const pageResults = this.searchLatestVersions(pageIds);
    storageService.getSpace().setCell(
      this.tableId,
      docVersionId,
      'pageVersionsArrayJson',
      JSON.stringify(
        pageResults.map(
          pr =>
            ({
              id: pr.id,
              itemId: pr.itemId,
              createdAt: pr.createdAt
            }) as CollectionPageVersionData
        )
      )
    );
  }

  // increment doc and its pages in one go
  public saveWholeDocumentVersion(docId: string, sync = false) {
    if (!this.enabled) return;
    console.debug('[history] saving new full version for doc', docId);
    // space.transaction(() => {
    const pages = collectionService.getDocumentPages(docId);
    pages.forEach(p => {
      const page = collectionService.getItem(p.id);
      this.saveSingleVersion(page, 'snapshot');
    });
    this.addVersion(docId, sync);
    // });
  }

  public saveDeleteVersion(itemId: string, type: CollectionItemTypeValues) {
    if (!this.enabled) return;
    const latest = this.getLatestVersion(itemId);
    if (!latest || latest.op === 'deleted') return; // no-op
    if (type === CollectionItemType.document) {
      const pages = collectionService.getDocumentPages(itemId);
      pages.forEach(p => {
        this.saveSingleVersion(collectionService.getItem(p.id), 'deleted');
      });
      this.saveSingleVersion(collectionService.getItem(itemId), 'deleted');
    }
    if (type === CollectionItemType.page) {
      // if individual page deletion, don't delete if document still exists, but,
      // must create a new document version
      // !! without the page about to be deleted...
      this.saveVersionSync(collectionService.getItemParent(itemId), [itemId]);
      this.saveSingleVersion(collectionService.getItem(itemId), 'deleted');
    }
  }

  private duplicateSingleVersion(
    newVersion: CollectionItemVersion,
    op: CollectionItemVersionOp
  ) {
    const space = storageService.getSpace();
    let versionId: string | undefined;
    space.transaction(() => {
      // must update previous ranks - not ideal, but needed for the get latest pages query
      const versions = this.getVersions(newVersion.itemId);
      versions.forEach(v => {
        const previousRank = space.getCell('history', v.id, 'rank') as number;
        space.setCell('history', v.id, 'rank', previousRank + 1);
      });
      const contentId = space.getCell('history', newVersion.id, 'contentId');
      versionId = space.addRow(this.tableId, {
        op,
        itemId: newVersion.itemId,
        createdAt: Date.now(),
        snapshotJson: newVersion.snapshotJson
          ? JSON.stringify(newVersion.snapshotJson)
          : undefined,
        pageVersionsArrayJson: newVersion.pageVersionsArrayJson
          ? JSON.stringify(newVersion.pageVersionsArrayJson)
          : undefined,
        contentId,
        rank: 0
      });
    });
    return versionId;
  }

  public markLatestVersionDeleted(
    type: CollectionItemTypeValues,
    itemId: string,
    parentId: string,
    skipDocUpdate = false
  ) {
    if (!this.enabled) return;
    const latest = this.getLatestVersion(itemId);
    if (latest.op === 'deleted') return; // no-op

    if (type === CollectionItemType.document) {
      // if has pages, mark them as deleted too
      if (latest.pageVersionsArrayJson?.length || 0 > 0) {
        latest.pageVersionsArrayJson?.forEach(pv => {
          const latestPageVersion = this.getLatestVersion(pv.itemId);
          if (latestPageVersion.op !== 'deleted') {
            this.duplicateSingleVersion(latestPageVersion, 'deleted');
          }
        });
        latest.pageVersionsArrayJson = [];
      }
      this.duplicateSingleVersion(latest, 'deleted');
    }
    if (type === CollectionItemType.page) {
      const latestDoc = this.getLatestVersion(parentId);
      if (latestDoc.op === 'deleted') return; // no-op
      // if doc still exists, create new version
      if (collectionService.itemExists(parentId) && !skipDocUpdate) {
        this.saveVersionSync(parentId, [itemId]);
      }
      this.duplicateSingleVersion(latest, 'deleted');
    }
  }

  public hardDeleteVersions(itemId: string) {
    this.getVersions(itemId).forEach(v => this.hardDeleteVersion(v.id!));
  }

  private hardDeleteVersion(versionId: string) {
    const space = storageService.getSpace();
    const contentId = space
      .getCell(this.tableId, versionId, 'contentId')
      ?.toString();

    // assuming there is no individual version delete for a doc
    // because otherwise should check if contentId is not used elsewhere
    space.transaction(() => {
      space.delRow(this.tableId, versionId);
      if (contentId) space.delRow(this.contentTableId, contentId);
    });
  }

  private saveVersionSync(id: string, skipPages: string[] = []) {
    const space = storageService.getSpace();
    if (!space.hasRow('collection', id)) return;
    const current = space.getRow('collection', id);
    this.saveVersionFromItem({ ...current, id } as CollectionItem, skipPages);
  }

  // when leaving app, must save pending timeouts
  public saveNow() {
    if (!this.enabled) return;
    console.debug('force saving current tasks', this.timeouts.size);
    this.timeouts.forEach((t, id) => {
      clearTimeout(t);
      this.saveVersionSync(id);
    });
    this.timeouts.clear();
  }

  public disableForBulk<T>(callback: () => T) {
    this.saveNow();
    this.enabled = false;
    const result = callback();
    this.enabled = true;
    return result;
  }

  public updateAfterSync(ch: AfterSyncHistChange) {
    if (ch.change !== LocalChangeType.delete) {
      if (ch.type === CollectionItemType.document) {
        historyService.saveWholeDocumentVersion(ch.id, true);
      } else {
        // is single page
        // TODO and... mustn't be already updated by parent document?
        historyService.addVersion(ch.id, true);
      }
    } else {
      historyService.markLatestVersionDeleted(ch.type, ch.id, ch.parent);
    }
  }

  public gc() {
    const maxHistoryPerDoc = storageService
      .getSpace()
      .getValue('maxHistoryPerDoc');
    if (maxHistoryPerDoc <= 0) return;
    const space = storageService.getSpace();
    const queries = storageService.getSpaceQueries();
    const queryName = this.buildVersionsGCQuery(maxHistoryPerDoc);
    // delete history entries with rank > maxHistoryPerDoc
    const resultRows = queries.getResultRowIds(queryName).map(rowId => ({
      ...(queries.getResultRow(queryName, rowId) as { contentId: string }),
      versionId: rowId
    }));
    console.log('running versions gc', resultRows.length);
    const contentQuery = this.buildContentGCQuery('');
    resultRows.forEach(row => {
      space.delRow('history', row.versionId);
      // query by contentId here
      queries.setParamValue(contentQuery, 'contentId', row.contentId);
      if (queries.getResultRowIds(contentQuery).length === 0) {
        // content is now unused
        space.delRow('history_content', row.contentId);
      }
    });
    queries.delQueryDefinition(contentQuery);
    queries.delQueryDefinition(queryName);
  }
}

export const historyService = new CollectionHistoryService();
