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
import { reInitRemoteData } from './test-sync.utils';

interface PullTestChangeScenario {
  change: LocalChangeType;
  where: 'local' | 'remote';
}

interface PullTestEndStats {
  itemExists: boolean;
  itemHasConflict: boolean;
  localWins?: boolean;
  remoteWins?: boolean;
  // TODO on history too, check op
  // TODO but only check history for relevant types, and pages trigger two versions on doc, how to write that?
  itemHasVersions?: number;
  docParentHasVersions?: number;

  onDocument?: Omit<Partial<PullTestEndStats>, 'onDocument'>;
  onPage?: Omit<Partial<PullTestEndStats>, 'onPage'>;
  onFolder?: Omit<Partial<PullTestEndStats>, 'onFolder'>;
  onNotebook?: Omit<Partial<PullTestEndStats>, 'onNotebook'>;
}

// example stats?
// something like this (item, its parent, etc.)
// will suffice for most single pull tests
// but what if i want to generalize? do an array?
// with builder?
/**
 * stats = statsBuilder
 *    .theItem({}).itsParent({})
 *    .theItem({}).itsParent({})
 *    .ifPage()
 *    .theItem({}).itsParent({})
 *    .build() // produces array
 */

// const statsBuilder: any = {};
// const example = statsBuilder
//   .theItem({ id: 'r1', exists: true })
//   .itsParent({ exists: true })
//   .theItem({ id: 'r1', exists: true })
//   .itsParent({ exists: true })
//   .ifPage()
//   .theItem({ id: 'r1', exists: true })
//   .itsParent({ exists: true })
//   .build();

const stats = {
  theItem: {
    exists: true,
    hasVersions: 1
  },
  itsParent: {
    yo: 1
  },
  itsNewParent: {
    hasVersions: 2
  },
  itsOldParent: {
    hasVersions: 1
  },
  itsChildren: [
    {
      yo: 1
    }
  ],
  itsConflict: {
    exists: false
  }
};

const stats2 = {
  notableItems: [
    {
      theItem: {
        id: 'r1',
        exists: true
      },
      itsParent: {
        // ...
      }
    }
  ]
};

export interface PullTestScenario {
  description: string;
  force?: boolean;
  types?: CollectionItemType[];
  initRemoteData?: any; // Partial<CollectionItem>[];
  initLocalData?: any; //Partial<CollectionItem>[];
  currentItem?: any;
  changesBeforePull: PullTestChangeScenario[];
  endStats: PullTestEndStats; // {} or { d: {}, f: {}...  } // by type? or both
  only?: (args: any) => boolean; // for debug
  skip?: (args: any) => boolean; // for debug
}

export class PullTestScenarioBuilder {
  private readonly scenario: PullTestScenario;
  private readonly type: CollectionItemType;

  private localItems = new Map<string, CollectionItem>();
  private remoteItems = new Map<string, CollectionItem>();

  public constructor(scenario: PullTestScenario, type: CollectionItemType) {
    this.scenario = scenario;
    this.type = type;
  }

  //
  public withLocalData(): PullTestScenarioBuilder {
    return this;
  }

  public withRemoteData(): PullTestScenarioBuilder {
    return this;
  }

  public applyTestChangesInOrder(): PullTestScenarioBuilder {
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
          if (type === CollectionItemType.page) {
            // must create parent doc for page // TODO only if no doc in local data?
            const parentDoc = createLocalItem({
              type: CollectionItemType.document
            });
            parent = saveFunc(parentDoc);
          }
          if (type === CollectionItemType.notebook) {
            parent = ROOT_COLLECTION;
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
          deleteFunc(item.id);
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
    // TODO
    const item = this.getCurrentItem();
    const localTable = storageService.getSpace().getTable('collection');
    if (item === null) throw Error('could not find current item');
    const stats = this.getStats();

    // check item exists
    if (stats.itemExists) expect(localTable[item.id]).toBeDefined();
    else expect(localTable[item.id]).toBeUndefined();

    // test the item parent is allowed
    this.assertParentIsAllowed(item);

    // test (for pages) that parent document matches criteria
    // test local changes are not erased
  }

  private assertParentIsAllowed(item: CollectionItem) {
    const localTable = storageService.getSpace().getTable('collection');
    if (item.type !== CollectionItemType.notebook) {
      expect(item.parent).not.toBe(ROOT_COLLECTION);
      switch (item.type) {
        case CollectionItemType.document:
        case CollectionItemType.folder:
          expect(item.parent).toBe(DEFAULT_NOTEBOOK_ID); // TODO can change across tests
          break;
        case CollectionItemType.page:
          expect(item.parent).not.toBe(DEFAULT_NOTEBOOK_ID);
          expect(localTable[item.parent]).toBeDefined();
          expect(localTable[item.parent].type).toBe(
            CollectionItemType.document
          );
          break;
      }
    } else {
      expect(item.parent).toBe(ROOT_COLLECTION);
    }
  }

  public assertHistoryStats() {
    const type = this.type;
    const item = this.getCurrentItem(); // maybe move that to param?
    const localHistoryTable = storageService.getSpace().getTable('history');
    if (item === null) throw Error('could not find current item');
    const stats = this.getStats();

    let nbVersions =
      stats.itemHasVersions !== undefined ? stats.itemHasVersions : 1;
    if (!isPageOrDocument({ type })) {
      nbVersions = 0;
    }
    const versions = historyService.getVersions(item.id);
    expect(versions).toHaveLength(nbVersions);
    //   expect(localTable[item.id]).toBeUndefined();

    // TODO if required test parent document too
  }

  private getStats() {
    let stats = this.scenario.endStats;
    if (stats.onDocument) {
      stats = { ...stats, ...stats.onDocument };
    }
    if (stats.onPage) {
      stats = { ...stats, ...stats.onPage };
    }
    if (stats.onFolder) {
      stats = { ...stats, ...stats.onFolder };
    }
    if (stats.onNotebook) {
      stats = { ...stats, ...stats.onNotebook };
    }
    return stats;
  }

  private getCurrentItem() {
    if (this.scenario.currentItem) return this.scenario.currentItem;
    if (this.localItems.size > 0)
      return [...this.localItems.values()].filter(i => i.type === this.type)[0]; // TODO
    if (this.remoteItems.size > 0)
      return [...this.remoteItems.values()].filter(
        i => i.type === this.type
      )[0]; // TODO
    return null;
  }
}
