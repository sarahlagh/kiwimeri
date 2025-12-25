import {
  CollectionItem,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemVersion,
  HistorizedCollectionItemData,
  HistorizedCollectionItemRow,
  HistorizedVersionContentRow,
  PageResult,
  setFieldMeta
} from '@/collection/collection';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { getHash, ResultRow, Store } from 'tinybase/with-schemas';
import collectionService from './collection.service';
import storageService from './storage.service';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useRowWithRef,
  useTableWithRef
} from './tinybase/hooks';
import { SpaceType } from './types/space-types';

class CollectionHistoryService {
  private readonly storeId = 'space';
  private readonly tableId = 'history';
  private readonly contentTableId = 'history_content';
  private debounce = 60000; // TODO configurable
  private cache = new Map<string, number>();
  private timeouts = new Map<string, number>();

  private readonly versionsQuery = 'VersionsByItemId';
  private readonly versionsByIdQuery = 'VersionsByVersionId';
  private readonly hashQuery = 'ContentByHash';

  public start(space?: string) {
    const queries = storageService.getSpaceQueries(space);
    queries.setQueryDefinition(
      this.versionsQuery,
      this.tableId,
      ({ select, where, param, join }) => {
        select('itemId');
        select('created');
        select('pageVersions');
        select('versionData');
        select('contentData', 'content');
        select('contentData', 'preview');
        join(this.contentTableId, 'contentId').as('contentData');
        where('itemId', param('itemId') as string);
      }
    );
    queries.setQueryDefinition(
      this.hashQuery,
      this.contentTableId,
      ({ select, where, param }) => {
        select('hash');
        where('hash', param('hash') as string);
      }
    );
  }

  private setVersionsQueryParam(itemId: string) {
    storageService
      .getSpaceQueries()
      .setParamValue(this.versionsQuery, 'itemId', itemId);
  }

  private setHashQueryParam(hash: number) {
    storageService
      .getSpaceQueries()
      .setParamValue(this.hashQuery, 'hash', hash);
  }

  private mapToCollectionItemVersion = (
    rowId: string,
    resultRow: ResultRow
  ) => {
    const version: CollectionItemVersion = {
      id: rowId,
      created: resultRow.created.valueOf() as number,
      itemId: resultRow.itemId.valueOf() as string,
      versionData: JSON.parse(resultRow.versionData.valueOf() as string),
      content: resultRow.content.valueOf() as string,
      preview: resultRow.preview.valueOf() as string
    };
    if (resultRow.pageVersions) {
      version.pageVersions = resultRow.pageVersions.valueOf() as string;
    }
    return version;
  };

  private getResults(queryName: string) {
    return storageService
      .getSpaceQueries()
      .getResultSortedRowIds(queryName, 'created', true);
  }

  private useResults(queryName: string) {
    return useResultSortedRowIdsWithRef(
      this.storeId,
      queryName,
      'created',
      true
    );
  }

  public getVersions(itemId: string): CollectionItemVersion[] {
    const queries = storageService.getSpaceQueries();
    this.setVersionsQueryParam(itemId);
    return this.getResults(this.versionsQuery).map(rowId => {
      const resultRow = queries.getResultRow(this.versionsQuery, rowId);
      return this.mapToCollectionItemVersion(rowId, resultRow);
    });
  }

  public useVersions(itemId: string): CollectionItemVersion[] {
    const queries = storageService.getSpaceQueries();
    this.setVersionsQueryParam(itemId);
    return this.useResults(this.versionsQuery).map(rowId => {
      const resultRow = queries.getResultRow(this.versionsQuery, rowId);
      return this.mapToCollectionItemVersion(rowId, resultRow);
    });
  }

  public getLatestVersion(itemId: string) {
    return this.getVersions(itemId)[0];
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

  public useDocumentVersionedPages(docVersionId?: string): PageResult[] {
    const table = useTableWithRef(this.storeId, this.tableId);
    const dataTable = useTableWithRef(this.storeId, this.contentTableId);
    const docId = useCellWithRef(
      this.storeId,
      this.tableId,
      docVersionId || 'null',
      'itemId'
    ) as string;
    const rawPageVersions = useCellWithRef(
      this.storeId,
      this.tableId,
      docVersionId || 'null',
      'pageVersions'
    );
    if (!docId || !rawPageVersions) return [];
    const pageVersions: string[] = JSON.parse(rawPageVersions.toString());
    return pageVersions.map(rowId => {
      const pageRow = table[rowId] as HistorizedCollectionItemRow;
      const versionData = JSON.parse(
        pageRow.versionData
      ) as HistorizedCollectionItemData;
      const contentRow = dataTable[
        pageRow.contentId
      ] as HistorizedVersionContentRow;
      const pageResult: PageResult = {
        id: pageRow.itemId,
        type: CollectionItemType.page,
        parent: docId,
        ...versionData,
        order: versionData.order!,
        preview: contentRow.preview
      };
      return pageResult;
    });
  }

  public getPagesForVersion(docVersionId: string): CollectionItemVersion[] {
    const table = storageService.getSpace().getTable(this.tableId);
    const dataTable = storageService.getSpace().getTable(this.contentTableId);
    const rawPageVersions = storageService
      .getSpace()
      .getCell(this.tableId, docVersionId, 'pageVersions');
    if (!rawPageVersions) return [];
    const pageVersions: string[] = JSON.parse(rawPageVersions.toString());
    return pageVersions.map(rowId => {
      const pageRow = table[rowId] as HistorizedCollectionItemRow;
      const contentRow = dataTable[
        pageRow.contentId
      ] as HistorizedVersionContentRow;
      return this.mapToVersion(rowId, pageRow, contentRow);
    });
  }

  private mapToVersion(
    rowId: string,
    pageRow: HistorizedCollectionItemRow,
    contentRow: HistorizedVersionContentRow
  ) {
    return {
      id: rowId,
      created: pageRow.created,
      itemId: pageRow.itemId,
      versionData: JSON.parse(pageRow.versionData),
      content: contentRow.content,
      preview: contentRow.preview
    };
  }

  public addVersion(id: string, sync = false) {
    if (sync) {
      this.saveVersionSync(id);
      return;
    }
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
    const itemLastUpdated = storageService
      .getSpace()
      .getCell('collection', docId, 'updated');
    const versionCreated = storageService
      .getSpace()
      .getCell(this.tableId, versionId, 'created');
    return itemLastUpdated === versionCreated;
  }

  public restoreDocumentVersion(docId: string, versionId: string) {
    this.saveNow();
    const version = this.getVersions(docId).find(v => v.id === versionId);
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
        ...pageVersion.versionData,
        type: CollectionItemType.page,
        parent: docId,
        parent_meta: setFieldMeta(docId, pageVersion.versionData.created),
        content: pageVersion.content,
        updated: now,
        order: pageVersion.versionData.order!,
        order_meta: pageVersion.versionData.order_meta!
      };
      // bypass collection service to save a single page version
      space.setRow('collection', pId, recreatedPage);
      this.saveSingleContentVersion(recreatedPage);
      // TODO how about local changes / sync
    });

    // copy version data to current collection item
    const current = space.getRow('collection', docId) as CollectionItem;
    collectionService.saveItem(
      {
        ...current,
        ...version.versionData,
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
        ...version.versionData,
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

  public saveSingleContentVersion(item: CollectionItem) {
    const space = storageService.getSpace();
    let versionId: string | undefined;
    space.transaction(() => {
      const contentId = this.getOrCreatedContentId(space, item);
      versionId = space.addRow(this.tableId, {
        itemId: item.id,
        created: item.updated,
        versionData: this.buildVersionData(item),
        contentId
      });
    });
    return versionId;
  }

  public saveVersionFromItem(item: CollectionItem, skipPages: string[] = []) {
    console.debug('[history] saving new version for item', item.id);
    const space = storageService.getSpace();
    const versionId = this.saveSingleContentVersion(item);
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

  private getOrCreatedContentId(space: Store<SpaceType>, item: CollectionItem) {
    const hash = getHash(item.id! + item.content || '');
    this.setHashQueryParam(hash);
    const results = this.getResults(this.hashQuery);
    if (results.length > 0) {
      return results[0];
    }
    return space.addRow(this.contentTableId, {
      content: item.content || '',
      preview: searchAncestryService.getUnsavedItemPreview(item),
      hash
    });
  }

  private setPageVersions(
    docId: string,
    docVersionId: string,
    skipPages: string[] = []
  ) {
    const pageIds = collectionService
      .getDocumentPages(docId)
      .map(p => p.id)
      .filter(id => !skipPages.includes(id));
    const pageVersions = pageIds.map(id => this.getLatestVersion(id)?.id);
    storageService
      .getSpace()
      .setCell(
        this.tableId,
        docVersionId,
        'pageVersions',
        JSON.stringify(pageVersions)
      );
  }

  // increment doc and its pages in one go
  public saveWholeDocumentVersion(docId: string) {
    console.debug('[history] saving new full version for doc', docId);
    const space = storageService.getSpace();
    space.transaction(() => {
      const pages = collectionService.getDocumentPages(docId);
      pages.forEach(p => {
        const page = collectionService.getItem(p.id);
        const contentId = this.getOrCreatedContentId(space, page);
        space.addRow(this.tableId, {
          itemId: page.id,
          created: page.updated,
          versionData: this.buildVersionData(page),
          contentId
        });
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
    this.timeouts.forEach((t, id) => {
      clearTimeout(t);
      this.saveVersionSync(id);
    });
    this.timeouts.clear();
  }
}

export const historyService = new CollectionHistoryService();
