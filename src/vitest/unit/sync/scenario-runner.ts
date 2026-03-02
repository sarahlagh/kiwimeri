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
import { createLocalItem, fakeTimersDelay } from '@/vitest/setup/test.utils';
import { vi } from 'vitest';
import {
  PullTestEndStatsBuilder,
  PullTestEndStatsItem
} from './scenario-stats-builder.test';
import { reInitRemoteData } from './test-sync.utils';

interface PullTestChangeScenario {
  change: LocalChangeType;
  where: 'local' | 'remote';
}

export interface PullTestScenario {
  description: string;
  types?: CollectionItemType[];
  initRemoteData?: any; // Partial<CollectionItem>[];
  initLocalData?: any; //Partial<CollectionItem>[];
  changesBeforePull: PullTestChangeScenario[];
  endStats: (b: PullTestEndStatsBuilder) => PullTestEndStatsBuilder; // {} or { d: {}, f: {}...  } // by type? or both
  only?: (args: any) => boolean; // for debug
  skip?: (args: any) => boolean; // for debug
}

export class PullTestScenarioRunner {
  private readonly scenario: PullTestScenario;
  private readonly type: CollectionItemType;

  private localItems = new Map<string, CollectionItem>();
  private remoteItems = new Map<string, CollectionItem>();

  public constructor(scenario: PullTestScenario, type: CollectionItemType) {
    this.scenario = scenario;
    this.type = type;
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
    saveFunc: (item: CollectionItem) => string,
    deleteFunc: (id: string) => void
  ) {
    const type = this.type;
    switch (ch.change) {
      case LocalChangeType.add:
        {
          let parent = DEFAULT_NOTEBOOK_ID;
          if (type === CollectionItemType.notebook) {
            parent = ROOT_COLLECTION;
          } else if (type === CollectionItemType.page) {
            // must create parent doc for page // TODO only if no doc in local data?
            const parentDoc = createLocalItem({
              type: CollectionItemType.document,
              parent
            });
            parent = saveFunc(parentDoc);
          }
          const item = createLocalItem({ type, parent });
          saveFunc(item);
        }
        break;
      case LocalChangeType.update:
        break;
      case LocalChangeType.delete:
        {
          const item = this.getCurrentItem();
          if (!item) throw new Error('unable to find current item');
          deleteFunc(item.id!);
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
        const id = collectionService.saveItem(
          item,
          item.id,
          DEFAULT_NOTEBOOK_ID
        );
        this.localItems.set(id, item);
        return id;
      },
      // delete func
      id => {
        collectionService.deleteItem(id);
        this.localItems.delete(id);
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
    reInitRemoteData([...this.remoteItems.values()]);
  }

  public assertStats() {
    const localTable = storageService.getSpace().getTable('collection');
    const b = new PullTestEndStatsBuilder(this.type);
    const finalStats = this.scenario.endStats(b).build();
    finalStats.groups.forEach(group => {
      const id = group.theItem.id
        ? group.theItem.id
        : this.getCurrentItem()!.id!;
      console.log('testing', id);

      // common stats
      const theItem = this.getStats(this.type, group.theItem);
      this.assertCommonStatsItem(id, theItem);

      // test the item parent is allowed
      if (group.theItem.exists) {
        const parentType = this.assertParentIsAllowed(
          localTable[id] as CollectionItem
        );
        if (parentType !== null) {
          // null if parent is root
          const itsParent = this.getStats(parentType, group.itsParent);
          const parentId = localTable[id]?.parent as string;
          this.assertCommonStatsItem(parentId, itsParent);
        }
      }
      // TODO itsOldParent here (old parent might exist but item no longer)
    });

    // test local changes are not erased
  }

  private assertCommonStatsItem(
    id: string,
    stats: Required<Omit<PullTestEndStatsItem, 'id'>>
  ) {
    console.debug('common stats', id, stats);
    const localTable = storageService.getSpace().getTable('collection');
    if (id === ROOT_COLLECTION) expect(localTable[id]).toBeUndefined();
    else if (stats.exists) expect(localTable[id]).toBeDefined();
    else expect(localTable[id]).toBeUndefined();

    const items = collectionService.getAllCollectionItemsRecursive(
      localTable[id].parent as string
    );
    const conflict = items.find(r => r.conflict === id);
    if (stats.hasConflict) {
      expect(conflict).toBeDefined();
      expect(conflict?.id).not.toBe(id);
    } else {
      expect(conflict).toBeUndefined();
    }
  }

  private assertParentIsAllowed(
    item: CollectionItem
  ): CollectionItemType | null {
    const localTable = storageService.getSpace().getTable('collection');
    if (item.type !== CollectionItemType.notebook) {
      expect(item.parent).not.toBe(ROOT_COLLECTION);
      switch (item.type) {
        case CollectionItemType.document:
        case CollectionItemType.folder:
          expect(item.parent).toBe(DEFAULT_NOTEBOOK_ID); // TODO can change across tests
          return CollectionItemType.notebook;
        case CollectionItemType.page:
          expect(item.parent).not.toBe(DEFAULT_NOTEBOOK_ID);
          expect(localTable[item.parent]).toBeDefined();
          expect(localTable[item.parent].type).toBe(
            CollectionItemType.document
          );
          return CollectionItemType.document;
      }
    } else {
      expect(item.parent).toBe(ROOT_COLLECTION);
    }
    return null;
  }

  public assertHistoryStats() {
    const localTable = storageService.getSpace().getTable('collection');
    const b = new PullTestEndStatsBuilder(this.type);
    const finalStats = this.scenario.endStats(b).build();
    finalStats.groups.forEach(group => {
      const id = group.theItem.id
        ? group.theItem.id
        : this.getCurrentItem()!.id!;
      const parentId = group.itsParent?.id
        ? group.itsParent.id
        : this.getCurrentItem()!.parent;

      const theItem = this.getStats(this.type, group.theItem);
      this.assertCommonHistoryStatsItem(id, theItem);

      if (theItem.exists && parentId !== ROOT_COLLECTION) {
        const parentType = localTable[parentId!].type as CollectionItemType;
        const itsParent = this.getStats(parentType, group.itsParent);
        this.assertCommonHistoryStatsItem(parentId!, itsParent);
      }
      // TODO how do I find the parent if not exists?
    });
  }

  private assertCommonHistoryStatsItem(
    id: string,
    stats: Required<Omit<PullTestEndStatsItem, 'id'>>
  ) {
    const versions = historyService.getVersions(id);
    expect(versions).toHaveLength(stats.hasVersions);
  }

  private getCurrentItem() {
    if (this.localItems.size > 0)
      return [...this.localItems.values()].filter(i => i.type === this.type)[0]; // TODO
    if (this.remoteItems.size > 0)
      return [...this.remoteItems.values()].filter(
        i => i.type === this.type
      )[0]; // TODO
    return null;
  }

  private getStats(type: CollectionItemType, values?: PullTestEndStatsItem) {
    const defaultValues: Required<Omit<PullTestEndStatsItem, 'id'>> = {
      exists: true,
      hasConflict: false,
      hasVersions: isPageOrDocument({ type }) ? 1 : 0
    };
    return { ...defaultValues, ...values };
  }
}
