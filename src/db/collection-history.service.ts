import {
  CollectionItem,
  CollectionItemType,
  CollectionItemVersion,
  HistorizedCollectionItemData,
  HistorizedCollectionItemRow,
  HistorizedVersionDataRow
} from '@/collection/collection';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { ResultRow } from 'tinybase/with-schemas';
import collectionService from './collection.service';
import storageService from './storage.service';
import { useResultSortedRowIdsWithRef } from './tinybase/hooks';

class CollectionHistoryService {
  private readonly storeId = 'space';
  private readonly tableId = 'history';
  private readonly dataTableId = 'history_data';
  private debounce = 60000; // TODO configurable
  private cache = new Map<string, number>();
  private timeouts = new Map<string, number>();

  private readonly versionsQuery = 'versions';
  private readonly docVersionIndex = 'byDocVersionId';

  public start(space?: string) {
    const queries = storageService.getSpaceQueries(space);
    queries.setQueryDefinition(
      this.versionsQuery,
      this.tableId,
      ({ select, where, param, join }) => {
        select('itemId');
        select('created');
        select('pageVersions');
        select('data', 'versionData');
        select('data', 'versionPreview');
        join('history_data', 'versionDataId').as('data');
        where('itemId', param('itemId') as string);
      }
    );
  }

  private setVersionsQueryParam(itemId: string) {
    storageService
      .getSpaceQueries()
      .setParamValue(this.versionsQuery, 'itemId', itemId);
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
      versionPreview: resultRow.versionPreview.valueOf() as string
    };
    if (resultRow.pageVersions) {
      version.pageVersions = resultRow.pageVersions.valueOf() as string;
    }
    return version;
  };

  private getResults(queryName: string) {
    const queries = storageService.getSpaceQueries();
    const results = queries
      .getResultSortedRowIds(queryName, 'created', true)
      .map(rowId => {
        const resultRow = queries.getResultRow(queryName, rowId);
        return this.mapToCollectionItemVersion(rowId, resultRow);
      });
    return results;
  }

  private useResults(queryName: string) {
    const queries = storageService.getSpaceQueries();
    const results = useResultSortedRowIdsWithRef(
      this.storeId,
      queryName,
      'created',
      true
    ).map(rowId => {
      const resultRow = queries.getResultRow(queryName, rowId);
      return this.mapToCollectionItemVersion(rowId, resultRow);
    });
    return results;
  }

  public getVersions(itemId: string): CollectionItemVersion[] {
    this.setVersionsQueryParam(itemId);
    return this.getResults(this.versionsQuery);
  }

  public useVersions(itemId: string): CollectionItemVersion[] {
    this.setVersionsQueryParam(itemId);
    return this.useResults(this.versionsQuery);
  }

  public getLatestVersion(itemId: string) {
    return this.getVersions(itemId)[0];
  }

  public useVersion(docId: string, versionId: string) {
    return this.useVersions(docId).find(v => v.id === versionId);
  }

  public getPagesForVersion(docVersionId: string): CollectionItemVersion[] {
    const table = storageService.getSpace().getTable(this.tableId);
    const dataTable = storageService.getSpace().getTable(this.dataTableId);
    const row = storageService.getSpace().getRow(this.tableId, docVersionId);
    if (!row.pageVersions) return [];
    const pageVersions: string[] = JSON.parse(row.pageVersions.toString());
    return pageVersions.map(rowId => {
      const pageRow = table[rowId] as HistorizedCollectionItemRow;
      const dataRow = dataTable[
        pageRow.versionDataId
      ] as HistorizedVersionDataRow;
      const version: CollectionItemVersion = {
        id: rowId,
        created: pageRow.created,
        itemId: pageRow.itemId,
        versionData: JSON.parse(dataRow.versionData),
        versionPreview: dataRow.versionPreview
      };
      return version;
    });
  }

  public addVersion(id: string, sync = false) {
    if (sync) {
      this.saveVersion(id);
      return;
    }
    if (!this.cache.has(id)) this.cache.set(id, 0);
    if (Date.now() - this.cache.get(id)! >= this.debounce) {
      this.cache.set(id, Date.now());
      this.timeouts.set(
        id,
        setTimeout(
          () => {
            this.saveVersion(id);
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

  // TODO if version not pushed, reset local changes
  public restoreVersion(id: string, versionId: string) {
    this.saveNow();
    const version = this.getVersions(id).find(v => v.id === versionId);
    if (!version) return;
    // copy version data to current collection item
    const versionData = version.versionData;
    const current = storageService
      .getSpace()
      .getRow('collection', id) as CollectionItem;
    collectionService.saveItem(
      { ...current, ...versionData, updated: Date.now() },
      id
    );
  }

  private buildVersionData(item: CollectionItem) {
    const data: HistorizedCollectionItemData = {
      title: item.title,
      title_meta: item.title_meta,
      content: item.content,
      content_meta: item.content_meta,
      tags: item.tags,
      tags_meta: item.tags_meta,
      deleted: item.deleted,
      deleted_meta: item.deleted_meta,
      display_opts: item.display_opts,
      display_opts_meta: item.display_opts_meta,
      updated: item.updated
    };
    if (item.type === CollectionItemType.page) {
      data.order = item.order;
      data.order_meta = item.order_meta;
    }
    return JSON.stringify(data);
  }

  public addVersionFromItem(item: CollectionItem, skipPage = false) {
    console.debug('[history] saving new version for doc', item.id);
    const space = storageService.getSpace();
    let versionId: string | undefined;
    space.transaction(() => {
      // TODO must check if changes? so i don't add an unnecessary versionData, i can just link the previous
      const versionDataId = space.addRow(this.dataTableId, {
        versionData: this.buildVersionData(item),
        versionPreview: searchAncestryService.getUnsavedItemPreview(item)
      });
      versionId = space.addRow(this.tableId, {
        itemId: item.id,
        created: item.updated,
        versionDataId
      });
      if (item.type === CollectionItemType.page) {
        // if page, add document version too, and relation to document
        const parentDoc = space.getRow(
          'collection',
          item.parent
        ) as CollectionItem;
        const docVersionId = this.addVersionFromItem(
          {
            ...parentDoc,
            id: item.parent,
            updated: item.updated
          },
          true
        );
        this.setPageVersions(item.parent, docVersionId!);
      } else if (item.type === CollectionItemType.document && !skipPage) {
        this.setPageVersions(item.id!, versionId!);
      }
    });
    return versionId;
  }

  private setPageVersions(docId: string, docVersionId: string) {
    const pages = collectionService.getDocumentPages(docId); // will only catch previously existing pages
    const pageVersions = pages.map(page => this.getLatestVersion(page.id)?.id);
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
  public addWholeDocumentVersion(docId: string) {
    console.debug('[history] saving new full version for doc', docId);
    const space = storageService.getSpace();
    space.transaction(() => {
      const pages = collectionService.getDocumentPages(docId);
      pages.forEach(p => {
        const page = collectionService.getItem(p.id);
        const versionDataId = space.addRow(this.dataTableId, {
          versionData: this.buildVersionData(page),
          versionPreview: searchAncestryService.getUnsavedItemPreview(page)
        });
        space.addRow(this.tableId, {
          itemId: page.id,
          created: page.updated,
          versionDataId
        });
      });
      this.addVersion(docId);
    });
  }

  private saveVersion(id: string) {
    const current = storageService.getSpace().getRow('collection', id);
    this.addVersionFromItem({ ...current, id } as CollectionItem);
  }

  // when leaving app, must save pending timeouts
  public saveNow() {
    this.timeouts.forEach((t, id) => {
      clearTimeout(t);
      this.saveVersion(id);
    });
    this.timeouts.clear();
  }
}

export const historyService = new CollectionHistoryService();
