import { HistorizedCollectionItem } from '@/collection/collection';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { Table } from 'tinybase/store';
import storageService from './storage.service';

type HistoryCache = {
  ts: number;
  versionData: string;
  versionPreview: string;
};

class CollectionHistoryService {
  private readonly tableId = 'history';
  private debounce = 5000; // TODO configurable
  private cache = new Map<string, HistoryCache>();

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

  public getVersions(docId: string) {
    const table = storageService.getSpace().getTable(this.tableId);
    const queryName = this.fetchHistoryPerDocQuery(docId);
    return this.getResults(table, queryName);
  }

  public addVersion(id: string, created: number) {
    const item = storageService.getSpace().getRow('collection', id);
    const versionData = JSON.stringify({
      title: item.title,
      content: item.content,
      tags: item.tags,
      deleted: item.deleted,
      updated: item.updated
    });
    const versionPreview = searchAncestryService.getItemPreview(id);
    if (!this.cache.has(id))
      this.cache.set(id, { ts: 0, versionData, versionPreview });
    if (Date.now() - this.cache.get(id)!.ts >= this.debounce) {
      this.cache.set(id, { ts: Date.now(), versionData, versionPreview });
      setTimeout(() => {
        console.debug('saving new version for doc', id);
        storageService.getSpace().transaction(() => {
          // increment existing versions
          const existingVersions = this.getVersions(id);
          for (const version of existingVersions) {
            storageService
              .getSpace()
              .setCell(
                this.tableId,
                version.id!,
                'version',
                version.version + 1
              );
          }
          // TODO handle pages
          // const docId = type === CollectionItemType.document ? id : item.parent;
          storageService.getSpace().addRow(this.tableId, {
            docId: id,
            created,
            version: 0,
            versionData: this.cache.get(id)!.versionData,
            versionPreview: this.cache.get(id)!.versionPreview
          });
        });
      }, this.debounce);
    }
  }
}

export const historyService = new CollectionHistoryService();
