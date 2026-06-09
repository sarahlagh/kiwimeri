import {
  CollectionItem,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFieldEnum,
  isDocument
} from '@/collection/collection';
import {
  CONFLICTS_NOTEBOOK_ID,
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_SPACE_ID,
  ROOT_COLLECTION
} from '@/constants';
import { space, store } from '@/core/db/store';
import { DbSerializableData, MetaField, setMetaField } from '@/core/db/types';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import remotesService from '@/db/remotes.service';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/local-changes/model';
import { SyncDirection } from '@/remote-storage/sync.service';
import {
  createLocalItem,
  fakeTimersDelay,
  getNewValue,
  oneNotebook,
  TestField
} from '@@/_setup/test.utils';
import { expect, vi } from 'vitest';
import {
  PullTestEndStatsBuilder,
  PullTestEndStatsItem,
  RelevantItem
} from './scenario-stats-builder.test';
import {
  getRemoteContent,
  getRemoteFileInfo,
  reInitRemoteData
} from './test-sync.utils';

interface PullTestChangeScenario {
  id?: string;
  // parentId?: string; // TODO
  change: LocalChangeType;
  applyInitValue?: boolean; // only used for ADD change
  where: 'local' | 'remote';
  newValue?: string;
  forceField?: TestField;
  data?: Partial<Pick<CollectionItem, 'type' | 'parent'>>; // for ADD change
}

type ItemData = {
  id?: string;
  applyInitValue?: boolean;
  parent?: string;
  type?: CollectionItemTypeValues;
};

export interface PullTestScenario {
  id?: string;
  description: string;
  types?: CollectionItemTypeValues[];
  initRemoteData?: ItemData[];
  initLocalData?: ItemData[];
  fields?: TestField[];
  changesBeforePull: PullTestChangeScenario[];
  didPush?: boolean;
  didPull?: boolean;
  skipForcePull?: boolean;
  skipForcePush?: boolean;
  endStats: (
    b: PullTestEndStatsBuilder,
    field?: TestField
  ) => PullTestEndStatsBuilder;
  skip?: boolean; // for debug
}

type MinStatItem = Required<
  Omit<PullTestEndStatsItem, 'id' | 'parent' | 'type'>
>;

export class PullTestScenarioRunner {
  private readonly scenario: PullTestScenario;
  private readonly type: CollectionItemType;
  private forcePull = false;
  private forcePush = false;
  private testField?: TestField;

  private remoteItems = new Map<string, CollectionItem>();
  private relevantItems: RelevantItem[] = []; // = new Map<string, RelevantItem>();
  private newValuesMap = new Map<string, DbSerializableData>();

  private postStatsHadConflict = false;

  public constructor(
    scenario: PullTestScenario,
    type: CollectionItemType,
    direction: SyncDirection
  ) {
    this.scenario = scenario;
    this.type = type;
    if (direction === 'force-pull') this.forcePull = true;
    if (direction === 'force-push') this.forcePush = true;
    this.postStatsHadConflict = false;
  }

  public withTestField(field: TestField) {
    this.testField = field;
    return this;
  }

  public withLocalData(): PullTestScenarioRunner {
    if (!this.scenario.initLocalData) return this;
    for (const data of this.scenario.initLocalData) {
      this.applyTestChangeOnLocal({
        change: LocalChangeType.add,
        where: 'local',
        applyInitValue: data.applyInitValue,
        id: data.id,
        data: { type: data.type, parent: data.parent }
      });
    }
    localChangesService.clear();
    return this;
  }

  public async withRemoteData(): Promise<PullTestScenarioRunner> {
    if (!this.scenario.initRemoteData) return this;
    for (const data of this.scenario.initRemoteData) {
      this.applyTestChangeOnRemote({
        change: LocalChangeType.add,
        where: 'remote',
        applyInitValue: data.applyInitValue,
        id: data.id,
        data: { type: data.type, parent: data.parent }
      });
    }
    // make sure remote is seen as initially unchanged
    if (this.scenario.initLocalData) {
      await remotesService.configureRemotes(DEFAULT_SPACE_ID);
      const remoteInfo = await getRemoteFileInfo('collection.json');
      const state = remotesService.getRemotes()[0].state;
      store.setCell(
        'remoteState',
        state,
        'lastPulled',
        remoteInfo?.updated || 0
      );
    }
    return this;
  }

  public applyTestChangesInOrder(): PullTestScenarioRunner {
    localChangesService.clear();
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
    updateFunc: (
      id: string,
      field: CollectionItemUpdatableFieldEnum,
      data: DbSerializableData
    ) => void,
    deleteFunc: (id: string) => void
  ) {
    const type = ch.data?.type || this.type;
    let testField = this.testField;
    if (ch.forceField) {
      testField = ch.forceField;
    }

    switch (ch.change) {
      case LocalChangeType.add:
        {
          let parent = DEFAULT_NOTEBOOK_ID;
          let parentType = CollectionItemType.notebook;
          let parentParent = ROOT_COLLECTION;

          // if existing in local / remote data, merge ids
          const relevantItem = this.relevantItems.find(i => i.id === ch.id);
          if (relevantItem) {
            parent = relevantItem.parentId;
            parentType = relevantItem.parentType;
            parentParent = relevantItem.parentParentId;
          }

          // if parent existing in local / remote data, target it
          else if (ch.data?.parent) {
            const relevantParentItem = this.relevantItems.find(
              i => i.id === ch.data?.parent
            );
            if (!relevantParentItem) {
              throw new Error('need a parent in relevant items');
            }
            parent = relevantParentItem.id;
            parentType = relevantParentItem.type;
            parentParent = relevantParentItem.parentId;
          }

          if (type === CollectionItemType.notebook && !relevantItem) {
            parent = ROOT_COLLECTION;
          }
          const ids = new Map<string, string>();
          ids.set(parent, parent);
          const item = createLocalItem({ id: ch.id, type, parent }, ids);
          let initValue = relevantItem?.initValue;
          if (ch.applyInitValue) {
            if (!testField) {
              throw new Error('need a TestField to apply field value');
            }
            if (testField.field === 'parent') {
              initValue = {
                field: testField,
                value: item.parent,
                at: item.created
              };
            } else {
              if (!initValue) {
                initValue = {
                  field: testField,
                  value: getNewValue(testField.valueType),
                  at: item.created
                };
              }
              (item as any)[testField.field] = initValue.value;
              (item as any)[`${testField.field}_meta`] = setMetaField(
                item.created,
                `${initValue.value}`
              );
            }
          }

          const id = ch.id || item.id!;
          saveFunc({ ...item, id });
          if (!relevantItem) {
            this.relevantItems.push({
              id,
              type: item.type as CollectionItemType,
              parentId: parent,
              parentType,
              parentParentId: parentParent,
              initValue,
              from: ch.where
            });
          }
        }
        break;
      case LocalChangeType.update:
        {
          if (!testField) {
            throw new Error('need a TestField to applyfield value');
          }
          if (!ch.id && this.relevantItems.length !== 1) {
            throw new Error(
              'on update change id is mandatory if 0 or >1 relevant items '
            );
          }
          const id = ch.id || this.relevantItems[0].id;
          const relevantItem = this.relevantItems.find(i => i.id === id)!;

          let newValue;
          if (testField.field === 'parent') {
            const relevantParentItem = this.relevantItems.find(
              i => i.id === ch.newValue
            );
            if (relevantParentItem) {
              newValue = relevantParentItem.id;
            } else {
              // create new valid parent, but TODO: might wanna test both new parent and existing parent
              // TODO cross-notebook test too
              const newParent = createLocalItem({
                type: relevantItem.parentType,
                parent: relevantItem.parentParentId
              });
              const parentId = ch.newValue || newParent.id!;
              saveFunc({ ...newParent, id: parentId });
              newValue = parentId;
            }
          } else {
            if (ch.newValue) {
              if (this.newValuesMap.has(ch.newValue)) {
                newValue = this.newValuesMap.get(ch.newValue)!;
              } else {
                newValue = getNewValue(testField.valueType);
                this.newValuesMap.set(ch.newValue, newValue);
              }
            } else {
              newValue = getNewValue(testField.valueType);
            }
          }
          relevantItem[`${ch.where}Value`] = {
            field: testField,
            value: newValue,
            at: Date.now()
          };
          updateFunc(id, testField.field, newValue);
        }
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
      // update func
      (id, field, data) => {
        collectionService.setItemField(id, field, data);
      },
      // delete func
      id => {
        collectionService.deleteItem(id);
      }
    );
  }

  private applyTestChangeOnRemote(ch: PullTestChangeScenario) {
    this.applyTestChange(
      ch,
      // save func
      item => {
        this.remoteItems.set(item.id!, item);
        return item.id!;
      },
      // update func
      (id, field, data) => {
        const item = this.remoteItems.get(id) as any;
        item.updated = Date.now();
        item[field] = data;
        item[`${field}_meta`] = setMetaField(Date.now(), `${data}`);
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
    const b = new PullTestEndStatsBuilder(
      this.type,
      this.testField,
      this.forcePull
    );
    const finalStats = this.scenario
      .endStats(b, this.testField)
      .build(this.relevantItems);

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
      // itsOldParent here (old parent might exist but item no longer)
      if (group.itsOldParent && group.itsOldParent.id !== ROOT_COLLECTION) {
        this.assertCommonStatsItem(
          group.itsOldParent.id!,
          group.itsOldParent.parent!,
          parentType,
          this.getStats(parentType, group.itsOldParent)
        );
      }
    });

    // test local changes are not erased
  }

  private assertCommonStatsItem(
    id: string,
    parentId: string,
    type: CollectionItemTypeValues,
    stats: MinStatItem
  ) {
    console.debug('common stats', id, stats);
    const localTable = space.getTable('collection');
    const relevantItem = this.relevantItems.find(i => i.id === id);

    if (stats.exists) {
      expect(localTable[id]).toBeDefined();
      const itemType = localTable[id]?.type?.toString();
      expect(itemType).toBe(type);
    } else {
      expect(localTable[id]).toBeUndefined();
    }

    const items =
      collectionService.getAllCollectionItemsRecursive(ROOT_COLLECTION);
    const conflict = items.find(r => r.conflict === id);
    if (stats.hasConflict) {
      this.postStatsHadConflict = true;
      expect(conflict).toBeDefined();
      if (stats.conflictHasParent === CONFLICTS_NOTEBOOK_ID) {
        expect(conflict?.id).toBe(id);
        expect(conflict?.parent).toBe(CONFLICTS_NOTEBOOK_ID);
        expect(
          localChangesService
            .getLocalChanges()
            .filter(
              lc =>
                lc.change === LocalChangeType.add &&
                lc.itemId === CONFLICTS_NOTEBOOK_ID
            )
        ).toHaveLength(1);
      } else {
        expect(conflict?.id).not.toBe(id);
        expect(conflict?.parent).toBe(
          stats.conflictHasParent ? stats.conflictHasParent : parentId
        );
      }
      if (stats.conflictHasParent) {
        expect(localTable[stats.conflictHasParent]).toBeDefined();
      }
      if (stats.conflictHasValue) {
        if (!this.testField) {
          throw new Error('need a TestField to check conflict field value');
        }
        const expectedValue = relevantItem
          ? relevantItem[`${stats.conflictHasValue}Value`]
          : null;
        expect(localTable[conflict!.id][this.testField.field]).toBe(
          expectedValue?.value
        );
      }
    } else {
      expect(conflict).toBeUndefined();
    }

    if (stats.hasValue) {
      const expectedValue = relevantItem
        ? relevantItem[`${stats.hasValue}Value`]
        : null;
      const testField = expectedValue?.field || this.testField;
      if (!testField) {
        throw new Error('need a TestField to check field value');
      }
      expect(localTable[id][testField.field]).toEqual(expectedValue?.value);
      const json = localTable[id][`${testField.field}_meta`];
      expect(json).toBeDefined();
      const metaField = json as MetaField;
      expect(metaField._u).toBe(expectedValue?.at);
    }

    stats.otherAssert(localTable[id] as CollectionItem, relevantItem);
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
        if (this.testField?.field !== 'parent')
          expect(parentId).toBe(DEFAULT_NOTEBOOK_ID); // TODO can change across tests
        expect(parentType).toBe(CollectionItemType.notebook);
        break;
      case CollectionItemType.folder:
        if (this.testField?.field !== 'parent')
          expect(parentId).toBe(DEFAULT_NOTEBOOK_ID); // TODO can change across tests
        expect(parentType).toBe(CollectionItemType.notebook);
        break;
      case CollectionItemType.notebook:
        if (this.testField?.field !== 'parent')
          expect(parentId).toBe(ROOT_COLLECTION);
        expect(parentType).toBe(CollectionItemType.notebook);
        break;
    }
  }

  public assertHistoryStats() {
    const b = new PullTestEndStatsBuilder(
      this.type,
      this.testField,
      this.forcePull
    );
    const finalStats = this.scenario
      .endStats(b, this.testField)
      .build(this.relevantItems);
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

      if (group.itsOldParent && group.itsOldParent.id !== ROOT_COLLECTION) {
        const oldParentId = group.itsOldParent.id!;
        const parentType = group.itsOldParent.type as CollectionItemType;
        const itsOldParent = this.getStats(parentType, group.itsOldParent);
        this.assertCommonHistoryStatsItem(oldParentId!, itsOldParent);
      }
    });
  }

  private assertCommonHistoryStatsItem(id: string, stats: MinStatItem) {
    const versions = historyService.getVersions(id);
    expect(versions).toHaveLength(stats.hasVersions);
    for (let i = 0; i < stats.latestVersionsOp.length; i++) {
      expect(versions[i].op).toBe(stats.latestVersionsOp[i]);
    }

    stats.otherHistoryAssert(versions);
  }

  private getStats(
    type: CollectionItemTypeValues,
    values: PullTestEndStatsItem
  ) {
    const hasContent = isDocument({ type });
    const defaultValues: MinStatItem = {
      exists: true,
      hasConflict: false,
      conflictHasParent: null,
      conflictHasValue: null,
      hasValue: null,
      hasVersions: hasContent ? 1 : 0,
      latestVersionsOp: hasContent ? ['snapshot'] : [],
      otherAssert: () => {},
      otherHistoryAssert: () => {}
    };
    return { ...defaultValues, ...values };
  }

  public async assertRemote(resp: {
    success: boolean;
    didPush: boolean;
    didPull: boolean;
  }) {
    let didPull = this.scenario.didPull;
    let didPush = this.scenario.didPush;
    if (this.forcePull) {
      didPull = true;
      didPush = undefined;
    } else if (this.forcePush) {
      didPull = undefined;
      didPush = true;
    } else {
      if (didPull === undefined) {
        didPull =
          this.scenario.changesBeforePull.filter(c => c.where === 'remote')
            .length > 0;
      }
      if (didPush === undefined) {
        const hadLocalChanges =
          this.scenario.changesBeforePull.filter(c => c.where === 'local')
            .length > 0;
        didPush = !this.postStatsHadConflict && hadLocalChanges;
      }
    }

    expect(resp.didPull).toBe(didPull);
    expect(resp.didPush).toBe(didPush);

    if (resp.didPush) {
      // check remote content - should be identical to local
      const localContent = space.getTable('collection');
      const itemIds = Object.keys(localContent);
      const remoteContent = await getRemoteContent();
      expect(remoteContent.content).toHaveLength(itemIds.length);
      remoteContent.content.forEach(i => {
        expect(i).toEqual({ ...localContent[i.id!], id: i.id! });
      });
    }
  }
}
