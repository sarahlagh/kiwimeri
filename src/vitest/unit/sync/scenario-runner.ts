import {
  CollectionItem,
  CollectionItemType,
  isPageOrDocument
} from '@/collection/collection';
import { DEFAULT_NOTEBOOK_ID, ROOT_COLLECTION } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import storageService from '@/db/storage.service';
import { LocalChangeType } from '@/db/types/store-types';
import {
  createLocalItem,
  fakeTimersDelay,
  oneNotebook
} from '@/vitest/setup/test.utils';
import { vi } from 'vitest';
import {
  PullTestEndStatsBuilder,
  PullTestEndStatsItem,
  RelevantItem
} from './scenario-stats-builder.test';
import { reInitRemoteData } from './test-sync.utils';

interface PullTestChangeScenario {
  id?: string;
  // parentId?: string; // TODO
  change: LocalChangeType;
  where: 'local' | 'remote';
}

export interface PullTestScenario {
  description: string;
  types?: CollectionItemType[];
  initRemoteData?: any; // Partial<CollectionItem>[];
  initLocalData?: any; //Partial<CollectionItem>[];
  changesBeforePull: PullTestChangeScenario[];
  testForcePull?: boolean;
  endStats: (b: PullTestEndStatsBuilder) => PullTestEndStatsBuilder;
  only?: (args: any) => boolean; // for debug
  skip?: (args: any) => boolean; // for debug
}

type MinStatItem = Required<
  Omit<PullTestEndStatsItem, 'id' | 'parent' | 'type'>
>;

export class PullTestScenarioRunner {
  private readonly scenario: PullTestScenario;
  private readonly type: CollectionItemType;
  private force = false;

  private remoteItems = new Map<string, CollectionItem>();
  private relevantItems: RelevantItem[] = [];

  public constructor(
    scenario: PullTestScenario,
    type: CollectionItemType,
    force?: boolean
  ) {
    this.scenario = scenario;
    this.type = type;
    if (force !== undefined) this.force = force;
  }

  public withLocalData(): PullTestScenarioRunner {
    return this;
  }

  public withRemoteData(): PullTestScenarioRunner {
    return this;
  }

  public applyTestChangesInOrder(): PullTestScenarioRunner {
    this.scenario.changesBeforePull.forEach(ch => {
      vi.advanceTimersByTime(fakeTimersDelay);
      if (ch.where === 'local') {
        this.applyTestChangeOnLocal(ch);
      } else {
        this.applyTestChangeOnRemote(ch);
      }
    });
    vi.advanceTimersByTime(fakeTimersDelay);
    return this;
  }

  private applyTestChange(
    ch: PullTestChangeScenario,
    saveFunc: (item: CollectionItem & { id: string }) => void,
    deleteFunc: (id: string) => void
  ) {
    const type = this.type;
    switch (ch.change) {
      case LocalChangeType.add:
        {
          let parent = DEFAULT_NOTEBOOK_ID;
          let parentType = CollectionItemType.notebook;
          const parentParent = ROOT_COLLECTION;
          if (type === CollectionItemType.notebook) {
            parent = ROOT_COLLECTION;
          } else if (type === CollectionItemType.page) {
            // must create parent doc for page // TODO only if no doc in local data?
            const parentDoc = createLocalItem({
              type: CollectionItemType.document,
              parent
            });
            parent = parentDoc.id!;
            parentType = CollectionItemType.document;
            saveFunc({ ...parentDoc, id: parent });
          }
          const item = createLocalItem({ type, parent });
          saveFunc({ ...item, id: ch.id || item.id! });
          this.relevantItems.push({
            id: ch.id || item.id!,
            type: item.type as CollectionItemType,
            parentId: parent,
            parentType,
            parentParentId: parentParent,
            where: ch.where
          });
        }
        break;
      case LocalChangeType.update:
        break;
      case LocalChangeType.delete:
        {
          if (!ch.id && this.relevantItems.length !== 1) {
            throw new Error(
              'on delete change id is mandatory if 0 or >1 relevant items '
            );
          }
          deleteFunc(ch.id || this.relevantItems[0].id);
        }
        break;
      // TODO values
    }
  }

  private applyTestChangeOnLocal(ch: PullTestChangeScenario) {
    this.applyTestChange(
      ch,
      // save func
      item => {
        collectionService.saveItem(item, item.id, DEFAULT_NOTEBOOK_ID);
        return item.id;
      },
      // delete func
      id => {
        collectionService.deleteItem(id);
      }
    );
    // TODO check versionning is done
  }

  private applyTestChangeOnRemote(ch: PullTestChangeScenario) {
    this.applyTestChange(
      ch,
      // save func
      item => {
        this.remoteItems.set(item.id!, item);
        return item.id!;
      },
      // delete func
      id => {
        this.remoteItems.delete(id);
      }
    );
    // const data
    const data = [...this.remoteItems.values()];
    if (!data.find(i => i.id === DEFAULT_NOTEBOOK_ID)) {
      data.push(oneNotebook());
    }
    reInitRemoteData(data);
  }

  public assertStats() {
    const b = new PullTestEndStatsBuilder(this.type, this.force);
    const finalStats = this.scenario.endStats(b).build(this.relevantItems);
    finalStats.groups.forEach(group => {
      const id = group.theItem.id!;
      const itemType = group.theItem.type!;
      const parentId = group.itsParent!.id!;
      const parentType = group.itsParent!.type!;

      // common stats
      const theItem = this.getStats(this.type, group.theItem);
      this.assertCommonStatsItem(id, parentId, itemType, theItem);

      // test the item parent is allowed
      if (group.theItem.exists) {
        this.assertParentIsAllowed(parentId, itemType, parentType);
      }

      if (parentId !== ROOT_COLLECTION) {
        const itsParent = this.getStats(parentType, group.itsParent);
        this.assertCommonStatsItem(
          parentId,
          group.itsParent.parent!,
          parentType,
          itsParent
        );
      }
      // TODO itsOldParent here (old parent might exist but item no longer)
    });

    // test local changes are not erased
  }

  private assertCommonStatsItem(
    id: string,
    parentId: string,
    type: CollectionItemType,
    stats: MinStatItem
  ) {
    console.debug('common stats', id, stats);
    const localTable = storageService.getSpace().getTable('collection');

    if (stats.exists) {
      expect(localTable[id]).toBeDefined();
      const itemType = localTable[id]?.type?.toString();
      expect(itemType).toBe(type);
    } else {
      expect(localTable[id]).toBeUndefined();
    }

    const items = collectionService.getAllCollectionItemsRecursive(parentId);
    const conflict = items.find(r => r.conflict === id);
    if (stats.hasConflict) {
      expect(conflict).toBeDefined();
      expect(conflict?.id).not.toBe(id);
    } else {
      expect(conflict).toBeUndefined();
    }
  }

  private assertParentIsAllowed(
    parentId: string,
    itemTypeAsString?: string,
    parentTypeAsString?: string
  ) {
    const itemType = itemTypeAsString as CollectionItemType;
    const parentType = parentTypeAsString as CollectionItemType;
    switch (itemType) {
      case CollectionItemType.document:
        expect(parentId).toBe(DEFAULT_NOTEBOOK_ID); // TODO can change across tests
        expect(parentType).toBe(CollectionItemType.notebook);
        break;
      case CollectionItemType.folder:
        expect(parentId).toBe(DEFAULT_NOTEBOOK_ID); // TODO can change across tests
        expect(parentType).toBe(CollectionItemType.notebook);
        break;
      case CollectionItemType.page:
        expect(parentId).not.toBe(DEFAULT_NOTEBOOK_ID);
        expect(parentType).toBe(CollectionItemType.document);
        break;
      case CollectionItemType.notebook:
        expect(parentId).toBe(ROOT_COLLECTION);
        expect(parentType).toBe(CollectionItemType.notebook);
        break;
    }
  }

  public assertHistoryStats() {
    const b = new PullTestEndStatsBuilder(this.type, this.force);
    const finalStats = this.scenario.endStats(b).build(this.relevantItems);
    finalStats.groups.forEach(group => {
      const id = group.theItem.id!;
      const parentId = group.itsParent.id!;

      const theItem = this.getStats(this.type, group.theItem);
      this.assertCommonHistoryStatsItem(id, theItem);

      if (parentId !== ROOT_COLLECTION) {
        const parentType = group.itsParent.type as CollectionItemType;
        const itsParent = this.getStats(parentType, group.itsParent);
        this.assertCommonHistoryStatsItem(parentId!, itsParent);
      }
    });
  }

  private assertCommonHistoryStatsItem(id: string, stats: MinStatItem) {
    const versions = historyService.getVersions(id);
    for (let i = 0; i < stats.latestVersionsOp.length; i++) {
      expect(versions[i].op).toBe(stats.latestVersionsOp[i]);
    }
    expect(versions).toHaveLength(stats.hasVersions);
  }

  private getStats(type: CollectionItemType, values: PullTestEndStatsItem) {
    const hasContent = isPageOrDocument({ type });
    const defaultValues: MinStatItem = {
      exists: true,
      hasConflict: false,
      hasVersions: hasContent ? 1 : 0,
      latestVersionsOp: hasContent ? ['snapshot'] : []
    };
    return { ...defaultValues, ...values };
  }
}
