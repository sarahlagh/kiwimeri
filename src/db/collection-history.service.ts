import {
  CollectionItem,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemVersion,
  HistorizedCollectionItemData,
  HistorizedCollectionItemRow,
  HistorizedCollectionPageVersion,
  HistorizedVersionContentRow,
  PageResult,
  setFieldMeta
} from '@/collection/collection';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { getHash, Id, ResultRow } from 'tinybase/with-schemas';
import collectionService from './collection.service';
import storageService from './storage.service';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useRowWithRef
} from './tinybase/hooks';

type VersionsWithContentResult = ResultRow & {
  itemId: string;
  created: number;
  itemDataJson: string;
  pageVersionsArrayJson?: string;
  content: string;
  preview: string;
  hash: number;
  rank: number;
  virtualOrder?: number; // order calculated from the params, if array
};

type VersionsWithContentParam = {
  itemId: Id;
  created?: number;
};

const defaultSort = { by: 'created', descending: true };
const pagesSort = { by: 'virtualOrder', descending: false };

class CollectionHistoryService {
  private enabled = true;
  private readonly storeId = 'space';
  private readonly tableId = 'history';
  private readonly contentTableId = 'history_content';
  private debounce = 60000; // TODO configurable
  private cache = new Map<string, number>();
  private timeouts = new Map<string, number>();

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
    const created = Array.isArray(params) ? 0 : params.created || 0;
    const paramArray = Array.isArray(params) ? JSON.stringify(params) : '';
    queries.setQueryDefinition(
      queryName,
      'history',
      ({ select, where, param, join }) => {
        select('itemId');
        select('created');
        select('rank');
        select('itemDataJson');
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
            const created = getCell('created') as number;
            const paramByItemId = params.find(p => p.itemId === itemId);
            if (paramByItemId?.created && paramByItemId.created !== 0) {
              return paramByItemId.created === created;
            }
            return paramByItemId !== undefined;
          });
        }

        if (param('itemId') && param('itemId')!.toString().length > 0) {
          where('itemId', param('itemId') as string);
          if (param('created') && param('created') !== 0) {
            where('created', param('created') as string);
          }
        }
      },
      {
        itemId,
        created,
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
    const created = Array.isArray(params) ? 0 : params.created || 0;
    const paramArray = Array.isArray(params) ? JSON.stringify(params) : '';
    storageService
      .getSpaceQueries()
      .setParamValue(queryName, 'itemId', itemId)
      .setParamValue(queryName, 'created', created)
      .setParamValue(queryName, 'paramArray', paramArray);
  }

  private mapToCollectionItemVersion(
    rowId: string,
    resultRow: VersionsWithContentResult
  ) {
    const version: CollectionItemVersion = {
      id: rowId,
      created: resultRow.created,
      itemId: resultRow.itemId,
      itemDataJson: JSON.parse(resultRow.itemDataJson),
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
    ) as HistorizedCollectionItemRow;
    const contentRow = space.getRow(
      this.contentTableId,
      pageRow?.contentId || ''
    ) as HistorizedVersionContentRow;
    if (!pageRow || !contentRow) return undefined;
    return this.mapToVersion(versionId, pageRow, contentRow);
  }

  public useVersion(versionId: string) {
    const pageRow = useRowWithRef<HistorizedCollectionItemRow>(
      this.storeId,
      this.tableId,
      versionId
    );
    const contentRow = useRowWithRef<HistorizedVersionContentRow>(
      this.storeId,
      this.contentTableId,
      pageRow?.contentId || ''
    );
    if (!pageRow || !contentRow) return undefined;
    return this.mapToVersion(versionId, pageRow, contentRow);
  }

  private mapToVersion(
    rowId: string,
    versionRow: HistorizedCollectionItemRow,
    contentRow?: HistorizedVersionContentRow
  ): CollectionItemVersion {
    return {
      id: rowId,
      created: versionRow.created,
      itemId: versionRow.itemId,
      itemDataJson: JSON.parse(versionRow.itemDataJson),
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
    let pageVersions: HistorizedCollectionPageVersion[] = [];
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
        ...pageVersion.itemDataJson,
        order: pageVersion.itemDataJson.order!,
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
    let pageVersions: HistorizedCollectionPageVersion[] = [];
    if (rawPageVersions) {
      pageVersions = JSON.parse(rawPageVersions.toString());
    }
    return this.searchVersions(pageVersions);
  }

  public addVersion(id: string) {
    if (!this.enabled) return;
    if (!this.cache.has(id)) this.cache.set(id, 0);
    if (Date.now() - this.cache.get(id)! >= this.debounce) {
      this.cache.set(id, Date.now());
      this.timeouts.set(
        id,
        setTimeout(
          () => {
            this.saveVersionSync(id);
            this.timeouts.delete(id);
          },
          this.debounce,
          []
        )
      );
    }
  }

  public versionExists(id: string) {
    return storageService.getSpace().hasRow(this.tableId, id);
  }

  public isCurrentVersion(docId: string, versionId: string) {
    const space = storageService.getSpace();
    const itemLastUpdated = space.getCell('collection', docId, 'updated');
    const versionCreated = space.getCell(this.tableId, versionId, 'created');
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
        ...pageVersion.itemDataJson,
        type: CollectionItemType.page,
        parent: docId,
        parent_meta: setFieldMeta(docId, pageVersion.itemDataJson.created),
        content: pageVersion.content,
        updated: now,
        order: pageVersion.itemDataJson.order!,
        order_meta: pageVersion.itemDataJson.order_meta!
      };
      // bypass collection service to save a single page version
      space.setRow('collection', pId, recreatedPage);
      this.saveSingleVersion({ ...recreatedPage, id: pId });
      // TODO how about local changes / sync
    });

    // copy version data to current collection item
    const current = space.getRow('collection', docId) as CollectionItem;
    collectionService.saveItem(
      {
        ...current,
        ...version.itemDataJson,
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
        ...version.itemDataJson,
        content: version.content,
        updated: Date.now()
      },
      pageId
    );
  }

  private buildVersionData(item: CollectionItem) {
    const data: HistorizedCollectionItemData = {
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
    console.debug('[history] saving new version for item', item.id);
    const space = storageService.getSpace();
    const versionId = this.saveSingleVersion(item);
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

  private saveSingleVersion(item: CollectionItem) {
    const space = storageService.getSpace();
    let versionId: string | undefined;
    space.transaction(() => {
      // must update previous ranks - not ideal, but needed for the get latest pages query
      this.getVersions(item.id!).forEach(v => {
        const previousRank = space.getCell('history', v.id, 'rank') as number;
        space.setCell('history', v.id, 'rank', previousRank + 1);
      });
      const { contentId } = this.getOrCreatedContentId(item);
      versionId = space.addRow(this.tableId, {
        itemId: item.id,
        created: item.updated,
        itemDataJson: this.buildVersionData(item),
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
              created: pr.created
            }) as HistorizedCollectionPageVersion
        )
      )
    );
  }

  // increment doc and its pages in one go
  public saveWholeDocumentVersion(docId: string) {
    if (!this.enabled) return;
    console.debug('[history] saving new full version for doc', docId);
    const space = storageService.getSpace();
    space.transaction(() => {
      const pages = collectionService.getDocumentPages(docId);
      pages.forEach(p => {
        const page = collectionService.getItem(p.id);
        this.saveSingleVersion(page);
      });
      this.addVersion(docId);
    });
  }

  public deleteVersions(
    itemId: string,
    type: CollectionItemTypeValues,
    isRootDeletion = false
  ) {
    if (type === CollectionItemType.page && isRootDeletion) {
      // if individual page deletion, don't delete if document still exists, but,
      // must create a new document version
      // !! without the page about to be deleted...
      this.saveVersionSync(collectionService.getItemParent(itemId), [itemId]);
      return;
    }
    this.getVersions(itemId).forEach(v => this.deleteVersion(v.id!));
  }

  private deleteVersion(versionId: string) {
    const space = storageService.getSpace();
    const contentId = space
      .getCell(this.tableId, versionId, 'contentId')
      ?.toString();

    // assuming there is no individual version delete
    // because otherwise should check if contentId is not used elsewhere
    space.transaction(() => {
      space.delRow(this.tableId, versionId);
      if (contentId) space.delRow(this.contentTableId, contentId);
    });
  }

  private saveVersionSync(id: string, skipPages: string[] = []) {
    const space = storageService.getSpace();
    const current = space.getRow('collection', id);
    this.saveVersionFromItem({ ...current, id } as CollectionItem, skipPages);
  }

  // when leaving app, must save pending timeouts
  public saveNow() {
    if (!this.enabled) return;
    console.log('force saving timeouts', this.timeouts.size);
    this.timeouts.forEach((t, id) => {
      clearTimeout(t);
      this.saveVersionSync(id);
    });
    this.timeouts.clear();
  }
}

export const historyService = new CollectionHistoryService();
