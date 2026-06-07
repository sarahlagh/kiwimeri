import {
  CollectionItem,
  CollectionItemSnapshotData,
  CollectionItemType,
  CollectionItemVersion,
  CollectionItemVersionContentRow,
  CollectionItemVersionOp,
  CollectionItemVersionRow
} from '@/collection/collection';
import { space, spaceQueries } from '@/core/db/store';
import { LocalChangeType } from '@/domain/local-changes/model';
import { AfterSyncChange } from '@/remote-storage/sync-types';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { getHash, Id, ResultRow } from 'tinybase/with-schemas';
import collectionService from './collection.service';
import { useRowWithRef } from './tinybase/hooks';
import userSettingsService from './user-settings.service';

type VersionsWithContentResult = ResultRow & {
  op: CollectionItemVersionOp;
  itemId: string;
  createdAt: number;
  snapshotJson: string;
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

const defaultSort = { by: 'rank', descending: false };

class CollectionHistoryService {
  private enabled = true;
  private readonly storeId = 'space';
  private readonly tableId = 'history';
  private readonly contentTableId = 'history_content';
  private timeouts = new Map<string, NodeJS.Timeout>();

  private buildVersionsWithContentQuery(
    params: VersionsWithContentParam,
    latest: boolean
  ) {
    const queries = spaceQueries;
    let i = 0;
    const mainQueryName = 'GetVersionsWithContent';
    while (queries.hasQuery(`${mainQueryName}${i}`)) i++;
    const queryName = `${mainQueryName}${i}`;
    const itemId = params.itemId;
    const createdAt = params.createdAt || 0;
    queries.setQueryDefinition(
      queryName,
      'history',
      ({ select, where, param, join }) => {
        select('op');
        select('itemId');
        select('createdAt');
        select('rank');
        select('snapshotJson');
        select('contentData', 'content');
        select('contentData', 'preview');
        select('contentData', 'hash');
        join('history_content', 'contentId').as('contentData');

        if (param('latest') === true) {
          where('rank', 0);
        }

        if (param('itemId') && param('itemId')!.toString().length > 0) {
          where('itemId', param('itemId') as string);
          if (param('createdAt') && param('createdAt') !== 0) {
            where('createdAt', param('createdAt') as number);
          }
        }
      },
      {
        itemId,
        createdAt,
        latest
      }
    );
    return queryName;
  }

  private buildContentByHashQuery(hash: number) {
    const mainQueryName = 'ContentByHash';
    const queries = spaceQueries;
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
        where('hash', param('hash') as number);
      },
      { hash }
    );
    return queryName;
  }

  private buildVersionsGCQuery(maxPerDoc: number) {
    const queries = spaceQueries;
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

  private buildContentGCQuery(contentId: string) {
    const mainQueryName = 'ContentById';
    const queries = spaceQueries;
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
    return version;
  }

  private getResults(queryName: string, sort = defaultSort) {
    return spaceQueries.getResultSortedRowIds(
      queryName,
      sort.by,
      sort.descending
    );
  }

  public searchVersions(
    params: VersionsWithContentParam,
    limit?: number
  ): CollectionItemVersion[] {
    return this._search(params, defaultSort, false, 0, limit);
  }

  private _search(
    params: VersionsWithContentParam,
    sort: { by: string; descending: boolean },
    latest = false,
    offset?: number,
    limit?: number
  ) {
    const queryName = this.buildVersionsWithContentQuery(params, latest);
    const results = spaceQueries
      .getResultSortedRowIds(queryName, sort.by, sort.descending, offset, limit)
      .map(rowId => {
        const resultRow = spaceQueries.getResultRow(
          queryName,
          rowId
        ) as VersionsWithContentResult;
        return this.mapToCollectionItemVersion(rowId, resultRow);
      });
    spaceQueries.delQueryDefinition(queryName);
    return results;
  }

  public getVersions(itemId: string, limit?: number): CollectionItemVersion[] {
    return this.searchVersions({ itemId }, limit);
  }

  public getLatestVersion(itemId: string) {
    return this.getVersions(itemId, 1)[0];
  }

  public getVersion(versionId: string) {
    const versionRow = space.getRow(
      this.tableId,
      versionId
    ) as CollectionItemVersionRow;
    const contentRow = space.getRow(
      this.contentTableId,
      versionRow?.contentId || ''
    ) as CollectionItemVersionContentRow;
    if (!versionRow || !contentRow) return undefined;
    return this.mapToVersion(versionId, versionRow, contentRow);
  }

  public useVersion(versionId: string) {
    const versionRow = useRowWithRef<CollectionItemVersionRow>(
      this.storeId,
      this.tableId,
      versionId
    );
    const contentRow = useRowWithRef<CollectionItemVersionContentRow>(
      this.storeId,
      this.contentTableId,
      versionRow?.contentId || ''
    );
    if (!versionRow || !contentRow) return undefined;
    return this.mapToVersion(versionId, versionRow, contentRow);
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
      content: contentRow?.content || '',
      preview: contentRow?.preview || '',
      hash: contentRow?.hash || 0,
      rank: versionRow.rank
    };
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

      // force periodic checkpoint during long continuous writing
      const lastVersion = this.getLatestVersion(id)?.createdAt || null;
      if (lastVersion != null && now - lastVersion >= maxInterval) {
        this.flushVersion(id);
        return;
      }
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
    return space.hasRow(this.tableId, id);
  }

  public restoreDocumentVersion(docId: string, versionId: string) {
    this.saveNow();
    const version = this.getVersion(versionId);
    if (!version) return;

    // copy version data to current collection item
    const current = space.getRow('collection', docId) as CollectionItem;
    collectionService.saveItem(
      {
        ...current,
        type: CollectionItemType.document,
        ...version.snapshotJson,
        content: version.content,
        updated: Date.now()
      },
      docId
    );
  }

  private buildVersionData(item: CollectionItem) {
    const data: CollectionItemSnapshotData = {
      parent: item.parent,
      parent_meta: item.parent_meta,
      title: item.title,
      title_meta: item.title_meta,
      content_meta: item.content_meta,
      tags: item.tags,
      tags_meta: item.tags_meta,
      deleted: item.deleted,
      deleted_meta: item.deleted_meta,
      display_opts: item.display_opts,
      display_opts_meta: item.display_opts_meta,
      flags: item.flags,
      flags_meta: item.flags_meta,
      order: item.order,
      order_meta: item.order_meta,
      created: item.created,
      updated: item.updated
    };
    return JSON.stringify(data);
  }

  public saveVersionFromItem(item: CollectionItem) {
    if (!this.enabled) return;
    console.debug('[history] saving new version for item', item.id);
    return this.saveSingleVersion(item, 'snapshot');
  }

  private saveSingleVersion(item: CollectionItem, op: CollectionItemVersionOp) {
    let versionId: string | undefined;
    space.transaction(() => {
      // must update previous ranks - not ideal, but convenient for the gc query
      const versions = this.getVersions(item.id!);
      versions.forEach(v => {
        const previousRank = space.getCell('history', v.id, 'rank') as number;
        space.setCell('history', v.id, 'rank', previousRank + 1);
      });
      const { contentId } = this.getOrCreatedContentId(item);
      versionId = space.addRow(this.tableId, {
        op,
        itemId: item.id,
        createdAt: Date.now(),
        snapshotJson: this.buildVersionData(item),
        contentId,
        rank: 0
      });
    });
    return versionId;
  }

  private getOrCreatedContentId(item: Pick<CollectionItem, 'id' | 'content'>) {
    const contentHash = getHash(item.id! + item.content || '');
    const queryName = this.buildContentByHashQuery(contentHash);
    const results = this.getResults(queryName);
    spaceQueries.delQueryDefinition(queryName);
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

  public saveDeleteVersion(itemId: string) {
    if (!this.enabled) return;
    const latest = this.getLatestVersion(itemId);
    if (!latest || latest.op === 'deleted') return; // no-op
    this.saveSingleVersion(collectionService.getItem(itemId), 'deleted');
  }

  private duplicateSingleVersion(
    newVersion: CollectionItemVersion,
    op: CollectionItemVersionOp
  ) {
    let versionId: string | undefined;
    space.transaction(() => {
      // must update previous ranks - not ideal, but convenient for the gc query
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
        contentId,
        rank: 0
      });
    });
    return versionId;
  }

  public markLatestVersionDeleted(itemId: string) {
    if (!this.enabled) return;
    const latest = this.getLatestVersion(itemId);
    if (latest.op === 'deleted') return; // no-op

    this.duplicateSingleVersion(latest, 'deleted');
  }

  public hardDeleteVersions(itemId: string) {
    this.getVersions(itemId).forEach(v => this.hardDeleteVersion(v.id!));
  }

  private hardDeleteVersion(versionId: string) {
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

  private saveVersionSync(id: string) {
    if (!space.hasRow('collection', id)) return;
    const current = space.getRow('collection', id);
    this.saveVersionFromItem({ ...current, id } as CollectionItem);
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

  public updateAfterSync(ch: AfterSyncChange) {
    if (ch.change !== LocalChangeType.delete) {
      historyService.addVersion(ch.id, true);
    } else {
      historyService.markLatestVersionDeleted(ch.id);
    }
  }

  public gc() {
    const maxHistoryPerDoc = space.getValue('maxHistoryPerDoc');
    if (maxHistoryPerDoc <= 0) return;
    const queryName = this.buildVersionsGCQuery(maxHistoryPerDoc);
    // delete history entries with rank > maxHistoryPerDoc
    const resultRows = spaceQueries.getResultRowIds(queryName).map(rowId => ({
      ...(spaceQueries.getResultRow(queryName, rowId) as { contentId: string }),
      versionId: rowId
    }));
    console.log('running versions gc', resultRows.length);
    const contentQuery = this.buildContentGCQuery('');
    resultRows.forEach(row => {
      space.delRow('history', row.versionId);
      // query by contentId here
      spaceQueries.setParamValue(contentQuery, 'contentId', row.contentId);
      if (spaceQueries.getResultRowIds(contentQuery).length === 0) {
        // content is now unused
        space.delRow('history_content', row.contentId);
      }
    });
    spaceQueries.delQueryDefinition(contentQuery);
    spaceQueries.delQueryDefinition(queryName);
  }
}

export const historyService = new CollectionHistoryService();
