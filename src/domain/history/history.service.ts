import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { SpaceTablesType } from '@/core/db/store-schema';
import {
  CollectionItem,
  CollectionItemSnapshotData,
  CollectionItemType
} from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import {
  CollectionItemVersionContentRow,
  CollectionItemVersionOp,
  CollectionItemVersionRow
} from '@/domain/history/history';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import { getPlainText } from '@/shared/misc/getPlainText';
import { getHash, Id, Table } from 'tinybase/with-schemas';
import { LocalChangeType } from '../synchronization/local-changes';
import { AfterSyncChange } from '../synchronization/merging/types';
import fetchVersionsQuery, {
  CollectionItemVersion
} from './queries/fetchVersionsQuery';

const H = SpaceTables.History;
const HC = SpaceTables.HistoryContent;

class CollectionHistoryService {
  private enabled = true;
  private timeouts = new Map<string, NodeJS.Timeout>();

  public getVersions(itemId: string, limit?: number): CollectionItemVersion[] {
    return fetchVersionsQuery.getResults(
      { itemId },
      undefined,
      undefined,
      0,
      limit
    );
  }

  public getLatestVersion(itemId: string) {
    return this.getVersions(itemId, 1)[0];
  }

  public getVersion(versionId: string) {
    const versionRow = space.getRow(H, versionId) as CollectionItemVersionRow;
    const contentRow = space.getRow(
      HC,
      versionRow?.contentId || ''
    ) as CollectionItemVersionContentRow;
    if (!versionRow || !contentRow) return undefined;
    return this.mapToVersion(versionId, versionRow, contentRow);
  }

  public mapToVersion(
    rowId: string,
    versionRow: CollectionItemVersionRow,
    contentRow?: CollectionItemVersionContentRow
  ): CollectionItemVersion {
    return {
      id: rowId,
      op: versionRow.op,
      createdAt: versionRow.createdAt,
      itemId: versionRow.itemId,
      snapshotJson: versionRow.snapshotJson as CollectionItemSnapshotData,
      hash: versionRow.contentId,
      content: contentRow?.content || '',
      preview: contentRow?.preview || ''
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
    const idleDelay = userPrefs.get('historyIdleTime');
    const maxInterval = userPrefs.get('historyMaxInterval');

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
      const lastChange = collectionService.getItem(id)?.updatedAt || 0;
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
    return space.hasRow(H, id);
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
        updatedAt: Date.now()
      },
      docId
    );
  }

  private buildVersionData(item: CollectionItem) {
    const data: CollectionItemSnapshotData = {
      parentId: item.parentId,
      parentId_meta: item.parentId_meta,
      title: item.title,
      title_meta: item.title_meta,
      content_meta: item.content_meta,
      tags: item.tags,
      tags_meta: item.tags_meta,
      settings: item.settings,
      settings_meta: item.settings_meta,
      order: item.order,
      order_meta: item.order_meta,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
    return data;
  }

  public saveVersionFromItem(item: CollectionItem) {
    if (!this.enabled) return;
    console.debug('[history] saving new version for item', item.id);
    return this.saveSingleVersion(item, 'snapshot');
  }

  private saveSingleVersion(item: CollectionItem, op: CollectionItemVersionOp) {
    let versionId: string | undefined;
    space.transaction(() => {
      const contentId = this.getOrCreatedContentId(item);
      versionId = space.addRow(H, {
        op,
        itemId: item.id,
        createdAt: Date.now(),
        snapshotJson: this.buildVersionData(item),
        contentId
      });
    });
    return versionId;
  }

  private getOrCreatedContentId(item: Pick<CollectionItem, 'id' | 'content'>) {
    const contentHash = `${getHash(item.id! + item.content || '')}`;
    if (space.hasRow(HC, contentHash)) {
      return contentHash;
    }
    space.setRow(HC, contentHash, {
      content: item.content || '',
      preview: getPlainText(item.content)
    });
    return contentHash;
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
      const contentId = space.getCell('history', newVersion.id, 'contentId');
      versionId = space.addRow(H, {
        op,
        itemId: newVersion.itemId,
        createdAt: Date.now(),
        snapshotJson: newVersion.snapshotJson,
        contentId
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
    const contentId = space.getCell(H, versionId, 'contentId')?.toString();

    // assuming there is no individual version delete for a doc
    // because otherwise should check if contentId is not used elsewhere
    space.transaction(() => {
      space.delRow(H, versionId);
      if (contentId) space.delRow(HC, contentId);
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

  private isContentIdUsed(
    historyTable: Table<SpaceTablesType, SpaceTables.History>,
    contentId: Id
  ) {
    for (const rowId of Object.keys(historyTable)) {
      const row = historyTable[rowId];
      if (row.contentId === contentId) return true;
    }
    return false;
  }

  public gc() {
    const maxHistoryPerDoc = userPrefs.get('maxHistoryPerDoc');
    if (maxHistoryPerDoc <= 0) return;
    const rankMap = new Map<string, number>();
    const historyTable = space.getTable(H);
    const rowIds = space.getSortedRowIds(H, 'createdAt', true);

    rowIds.forEach(rowId => {
      const row = historyTable[rowId];
      const itemId = row.itemId as string;
      let rank = 0;
      if (rankMap.has(itemId)) {
        rank = rankMap.get(itemId)! + 1;
      }
      rankMap.set(itemId, rank);
      if (rank >= maxHistoryPerDoc) {
        space.delRow(H, rowId);
        delete historyTable[rowId];
        // query by contentId here
        if (!this.isContentIdUsed(historyTable, row.contentId!)) {
          // content is now unused
          space.delRow(HC, row.contentId!);
        }
      }
    });
  }
}

export const historyService = new CollectionHistoryService();
