import {
  CollectionItem,
  CollectionItemDisplayOpts,
  CollectionItemType,
  HistorizedCollectionItem,
  HistorizedCollectionItemData
} from '@/collection/collection';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { Table } from 'tinybase/store';
import { Store } from 'tinybase/with-schemas';
import collectionService from './collection.service';
import storageService from './storage.service';
import {
  useResultSortedRowIdsWithRef,
  useTableWithRef
} from './tinybase/hooks';
import { SpaceType } from './types/space-types';
import userSettingsService from './user-settings.service';

class CollectionHistoryService {
  private readonly storeId = 'space';
  private readonly tableId = 'history';
  private readonly joinTableId = 'history_doc_pages';
  private debounce = 60000; // TODO configurable
  private cache = new Map<string, number>();
  private timeouts = new Map<string, number>();

  private readonly versionsQuery = 'versions';
  private readonly docVersionIndex = 'byDocVersionId';

  public start(space?: string) {
    const indexes = storageService.getSpaceIndexes(space);
    indexes.setIndexDefinition(
      this.docVersionIndex,
      'history_doc_pages',
      'docVersionId'
    );

    const queries = storageService.getSpaceQueries(space);
    queries.setQueryDefinition(
      this.versionsQuery,
      'history',
      ({ select, where, param }) => {
        select('itemId');
        select('created');
        where('itemId', param('itemId') as string);
      }
    );
  }

  private setVersionsQueryParam(itemId: string) {
    storageService
      .getSpaceQueries()
      .setParamValue(this.versionsQuery, 'itemId', itemId);
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
    this.setVersionsQueryParam(docId);
    return this.getResults(table, this.versionsQuery);
  }

  public useVersions(docId: string) {
    const table = useTableWithRef(this.storeId, this.tableId);
    this.setVersionsQueryParam(docId);
    return this.useResults(table, this.versionsQuery);
  }

  public useVersion(docId: string, versionId: string) {
    return this.useVersions(docId).find(v => v.id === versionId);
  }

  public getPagesForVersion(docVersionId: string) {
    const collectionTable = storageService.getSpace().getTable('collection');
    const table = storageService.getSpace().getTable(this.tableId);
    const joinTable = storageService.getSpace().getTable(this.joinTableId);

    // get pages
    const indexes = storageService.getSpaceIndexes();
    const pages = indexes
      .getSliceRowIds(this.docVersionIndex, docVersionId)
      .map(
        rel =>
          table[
            joinTable[rel].pageVersionId as string
          ] as HistorizedCollectionItem
      );

    // get historized pages sort order
    const docVersion = table[docVersionId] as HistorizedCollectionItem;
    const docVersionDisplayOpts = (
      JSON.parse(docVersion.versionData) as HistorizedCollectionItemData
    ).display_opts;
    let sort = userSettingsService.getDefaultDisplayOpts().sort;
    if (docVersionDisplayOpts) {
      sort = (JSON.parse(docVersionDisplayOpts) as CollectionItemDisplayOpts)
        .sort;
    }

    // apply sort to results
    // TODO: this is terrible. let tinybase do it - use query?
    return pages.sort((p1, p2) => {
      const page1 = (
        sort.descending
          ? collectionTable[p2.itemId]
          : collectionTable[p1.itemId]
      ) as CollectionItem;
      const page2 = (
        sort.descending
          ? collectionTable[p1.itemId]
          : collectionTable[p2.itemId]
      ) as CollectionItem;
      const field1 = (page1 as never)[sort.by];
      const field2 = (page2 as never)[sort.by];

      switch (sort.by) {
        case 'preview':
          return searchAncestryService
            .getUnsavedItemPreview(page1)
            .localeCompare(searchAncestryService.getUnsavedItemPreview(page2));
        case 'title':
          return ((field1 || '') as string).localeCompare(
            (field2 || '') as string
          );
        default: // all other sort fields are numeric
          return (field1 || 0) < (field2 || 0) ? -1 : 1;
      }
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
    if (item.type === CollectionItemType.page) {
      data.order = item.order;
      data.order_meta = item.order_meta;
    }
    return JSON.stringify(data);
  }

  public addVersionFromItem(item: CollectionItem, skipPage?: string) {
    console.debug('[history] saving new version for doc', item.id);
    const space = storageService.getSpace();
    let versionId: string | undefined;
    space.transaction(() => {
      versionId = space.addRow(this.tableId, {
        itemId: item.id,
        created: item.updated,
        versionData: this.getVersionData(item),
        versionPreview: searchAncestryService.getUnsavedItemPreview(item)
      });
      if (item.type === CollectionItemType.page) {
        // if page, add document version too, and relation to document
        const parentDoc = storageService
          .getSpace()
          .getRow('collection', item.parent) as CollectionItem;
        const docVersionId = this.addVersionFromItem(
          {
            ...parentDoc,
            id: item.parent,
            updated: item.updated
          },
          item.id
        );
        // if page didn't exist before, add it
        this.addRelation(space, docVersionId, versionId);
      } else if (item.type === CollectionItemType.document) {
        // if document & has pages, add relation to latest pages
        const pages = collectionService
          .getDocumentPages(item.id!)
          .filter(p => p.id !== skipPage);
        pages.forEach(page => {
          const pageVersions = this.getVersions(page.id);
          this.addRelation(space, versionId, pageVersions[0].id);
        });
      }
    });
    return versionId;
  }

  // increment doc and its pages
  public addWholeDocumentVersion(docId: string) {
    console.debug('[history] saving new full version for doc', docId);
    const space = storageService.getSpace();
    space.transaction(() => {
      const pages = collectionService.getDocumentPages(docId);
      pages.forEach(p => {
        const page = collectionService.getItem(p.id);
        space.addRow(this.tableId, {
          itemId: page.id,
          created: page.updated,
          versionData: this.getVersionData(page),
          versionPreview: searchAncestryService.getUnsavedItemPreview(page)
        });
      });
      this.addVersion(docId);
    });
  }

  private addRelation(
    space: Store<SpaceType>,
    docVersionId?: string,
    pageVersionId?: string
  ) {
    const joinId = `${docVersionId}${pageVersionId}`;
    space.setRow(this.joinTableId, joinId, {
      docVersionId,
      pageVersionId
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
