import {
  CollectionItem,
  HistorizedCollectionItem,
  HistorizedCollectionItemData
} from '@/collection/collection';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { Table } from 'tinybase/store';
import collectionService from './collection.service';
import storageService from './storage.service';
import {
  useResultSortedRowIdsWithRef,
  useTableWithRef
} from './tinybase/hooks';

// TODO on page version, must associate it with a document version
// TODO on version viewer, must fetch all pages associated with a document
class CollectionHistoryService {
  private readonly storeId = 'space';
  private readonly tableId = 'history';
  private debounce = 60000; // TODO configurable
  private cache = new Map<string, number>();
  private timeouts = new Map<string, number>();

  private fetchHistoryPerDocQuery(docId: string) {
    const queries = storageService.getSpaceQueries();
    const queryName = `fetchHistoryFor${docId}`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(
        queryName,
        this.tableId,
        ({ select, where }) => {
          select('docId');
          select('created');
          where('docId', docId);
        }
      );
    }
    return queryName;
  }

  private getResults(table: Table, queryName: string) {
    const results = storageService
      .getSpaceQueries()
      .getResultSortedRowIds(queryName, 'created', true)
      .map(rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as HistorizedCollectionItem;
      });
    return results;
  }

  private useResults(table: Table, queryName: string) {
    const results = useResultSortedRowIdsWithRef(
      this.storeId,
      queryName,
      'created',
      true
    ).map(rowId => {
      const row = table[rowId];
      return { ...row, id: rowId } as HistorizedCollectionItem;
    });
    return results;
  }

  public getVersions(docId: string) {
    const table = storageService.getSpace().getTable(this.tableId);
    const queryName = this.fetchHistoryPerDocQuery(docId);
    return this.getResults(table, queryName);
  }

  public useVersions(docId: string) {
    const table = useTableWithRef(this.storeId, this.tableId);
    const queryName = this.fetchHistoryPerDocQuery(docId);
    return this.useResults(table, queryName);
  }

  public useVersion(docId: string, versionId: string) {
    return this.useVersions(docId).find(v => v.id === versionId);
  }

  public addVersionFromItem(item: CollectionItem) {
    console.debug('[history] saving new version for doc', item.id);
    storageService.getSpace().addRow(this.tableId, {
      docId: item.id,
      created: item.updated,
      versionData: this.getVersionData(item),
      versionPreview: searchAncestryService.getUnsavedItemPreview(item)
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

  // TODO if version not pushed (how do i know?), reset local changes
  public restoreVersion(id: string, versionId: string) {
    this.saveNow();
    const version = this.getVersions(id).find(v => v.id === versionId);
    if (!version) return;
    // copy version data to current collection item
    const versionData = JSON.parse(
      version.versionData
    ) as HistorizedCollectionItemData;
    const current = storageService
      .getSpace()
      .getRow('collection', id) as CollectionItem;
    collectionService.saveItem(
      { ...current, ...versionData, updated: Date.now() },
      id
    );
  }

  private getVersionData(item: CollectionItem) {
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
    return JSON.stringify(data);
  }

  private saveVersion(id: string) {
    console.debug('[history] saving new version for doc', id);
    // TODO handle pages
    // const docId = type === CollectionItemType.document ? id : item.parent;
    const current = storageService.getSpace().getRow('collection', id);
    const versionData = this.getVersionData(current as CollectionItem);
    const versionPreview = searchAncestryService.getItemPreview(id);
    storageService.getSpace().addRow(this.tableId, {
      docId: id,
      created: current.updated,
      versionData,
      versionPreview
    });
  }

  // when leaving app, must save pending timeouts
  public saveNow() {
    this.timeouts.forEach((t, id) => {
      clearTimeout(t);
      this.saveVersion(id);
    });
  }
}

export const historyService = new CollectionHistoryService();
