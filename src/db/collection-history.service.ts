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

type HistoryCache = {
  ts: number;
  created: number;
  versionData: string;
  versionPreview: string;
};

class CollectionHistoryService {
  private readonly storeId = 'space';
  private readonly tableId = 'history';
  private debounce = 60000; // TODO configurable
  private cache = new Map<string, HistoryCache>();
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
          select('version');
          select('versionData');
          where('docId', docId);
        }
      );
    }
    return queryName;
  }

  private getResults(table: Table, queryName: string) {
    const results = storageService
      .getSpaceQueries()
      .getResultSortedRowIds(queryName, 'version', false)
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
      'version',
      false
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

  public addVersion(id: string, created: number, sync = false) {
    const item = storageService.getSpace().getRow('collection', id);
    const versionData = this.saveVersionData(item as CollectionItem);
    const versionPreview = searchAncestryService.getItemPreview(id);
    if (sync) {
      this.cache.set(id, {
        ts: Date.now(),
        created,
        versionData,
        versionPreview
      });
      this.saveVersion(id);
      return;
    }
    if (!this.cache.has(id))
      this.cache.set(id, { ts: 0, created, versionData, versionPreview });
    if (Date.now() - this.cache.get(id)!.ts >= this.debounce) {
      this.cache.set(id, {
        ts: Date.now(),
        created,
        versionData,
        versionPreview
      });
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
      { ...current, ...versionData },
      id,
      undefined,
      true
    );
  }

  private saveVersionData(item: CollectionItem) {
    const data: HistorizedCollectionItemData = {
      title: item.title,
      title_meta: item.title_meta,
      content: item.content,
      content_meta: item.content_meta,
      tags: item.tags,
      tags_meta: item.tags_meta,
      deleted: item.deleted,
      deleted_meta: item.deleted_meta,
      updated: item.updated
    };
    return JSON.stringify(data);
  }

  private saveVersion(id: string) {
    console.debug('saving new version for doc', id);
    storageService.getSpace().transaction(() => {
      // increment existing versions
      const existingVersions = this.getVersions(id);
      for (const version of existingVersions) {
        storageService
          .getSpace()
          .setCell(this.tableId, version.id!, 'version', version.version + 1);
      }
      // TODO handle pages
      // const docId = type === CollectionItemType.document ? id : item.parent;
      storageService.getSpace().addRow(this.tableId, {
        docId: id,
        version: 0,
        created: this.cache.get(id)!.created,
        versionData: this.cache.get(id)!.versionData,
        versionPreview: this.cache.get(id)!.versionPreview
      });
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
