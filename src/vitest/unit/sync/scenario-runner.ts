import {
  CollectionItem,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFieldEnum,
  isPageOrDocument,
  parseFieldMeta,
  setFieldMeta
} from '@/collection/collection';
import {
  CONFLICTS_NOTEBOOK_ID,
  DEFAULT_NOTEBOOK_ID,
  ROOT_COLLECTION
} from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/local-changes.service';
import storageService from '@/db/storage.service';
import { LocalChangeType, SerializableData } from '@/db/types/store-types';
import {
  createLocalItem,
  fakeTimersDelay,
  getNewValue,
  oneNotebook,
  TestField
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
  applyInitValue?: boolean; // only used for ADD change
  where: 'local' | 'remote';
  data?: Partial<CollectionItem>;
}

type ItemData = {
  id?: string;
  applyInitValue?: boolean;
  // parent?: string;
  type?: CollectionItemTypeValues;
};

export interface PullTestScenario {
  description: string;
  types?: CollectionItemTypeValues[];
  initRemoteData?: ItemData[];
  initLocalData?: ItemData[];
  fields?: TestField[];
  changesBeforePull: PullTestChangeScenario[];
  skipForcePull?: boolean;
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
  private force = false;
  private testField?: TestField;

  private remoteItems = new Map<string, CollectionItem>();
  private relevantItems: RelevantItem[] = []; // = new Map<string, RelevantItem>();

  public constructor(
    scenario: PullTestScenario,
    type: CollectionItemType,
    force?: boolean
  ) {
    this.scenario = scenario;
    this.type = type;
    if (force !== undefined) this.force = force;
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
        data: { type: data.type }
      });
    }
    localChangesService.clear();
    return this;
  }

  public withRemoteData(): PullTestScenarioRunner {
    if (!this.scenario.initRemoteData) return this;
    for (const data of this.scenario.initRemoteData) {
      this.applyTestChangeOnRemote({
        change: LocalChangeType.add,
        where: 'remote',
        applyInitValue: data.applyInitValue,
        id: data.id,
        data: { type: data.type }
      });
    }
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
    updateFunc: (
      id: string,
      field: CollectionItemUpdatableFieldEnum,
      data: SerializableData
    ) => void,
    deleteFunc: (id: string) => void
  ) {
    const type = ch.data?.type || this.type;

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
          // if page and must create its doc on remote, the doc must have the same id as local...

          if (type === CollectionItemType.notebook && !relevantItem) {
            parent = ROOT_COLLECTION;
          } else if (type === CollectionItemType.page) {
            // must create parent doc for page
            const parentDoc = createLocalItem({
              type: CollectionItemType.document,
              parent:
                parentParent !== ROOT_COLLECTION
                  ? parentParent
                  : DEFAULT_NOTEBOOK_ID
            });
            if (!relevantItem) {
              parent = parentDoc.id!;
              parentType = CollectionItemType.document;
              parentParent = parentDoc.parent;
            }
            saveFunc({ ...parentDoc, id: parent });
          }
          const item = createLocalItem({ id: ch.id, type, parent });
          // TODO use ch.data?
          let initValue = relevantItem?.initValue;
          if (ch.applyInitValue) {
            if (!this.testField) {
              throw new Error('need a TestField to apply field value');
            }
            if (this.testField.field === 'parent') {
              initValue = {
                value: item.parent,
                at: item.created
              };
            } else {
              if (!initValue) {
                initValue = {
                  value: getNewValue(this.testField.valueType),
                  at: item.created
                };
              }
              (item as any)[this.testField.field] = initValue.value;
              (item as any)[`${this.testField.field}_meta`] = setFieldMeta(
                `${initValue.value}`,
                item.created
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
          if (!this.testField) {
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
          if (this.testField.field === 'parent') {
            const relevantParentItem = this.relevantItems.find(
              i => i.id === ch.data?.parent
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
              const parentId = ch.data?.parent || newParent.id!;
              saveFunc({ ...newParent, id: parentId });
              newValue = parentId;
            }
          } else {
            newValue = getNewValue(this.testField.valueType);
          }
          relevantItem[`${ch.where}Value`] = {
            value: newValue,
            at: Date.now()
          };
          updateFunc(id, this.testField.field, newValue);
          // TODO use ch.data?
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
        item[`${field}_meta`] = setFieldMeta(`${data}`, Date.now());
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
      this.force
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
    type: CollectionItemType,
    stats: MinStatItem
  ) {
    console.debug('common stats', id, stats);
    const localTable = storageService.getSpace().getTable('collection');
    const relevantItem = this.relevantItems.find(i => i.id === id);

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
      expect(conflict?.parent).toBe(
        stats.isConflictOrphaned ? CONFLICTS_NOTEBOOK_ID : parentId
      );
      if (stats.isConflictOrphaned) {
        expect(localTable[CONFLICTS_NOTEBOOK_ID]).toBeDefined();
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
      if (!this.testField) {
        throw new Error('need a TestField to check field value');
      }
      const expectedValue = relevantItem
        ? relevantItem[`${stats.hasValue}Value`]
        : null;
      expect(localTable[id][this.testField.field]).toBe(expectedValue?.value);
      const json = localTable[id][`${this.testField.field}_meta`];
      expect(json).toBeDefined();
      const metaField = parseFieldMeta(json as string);
      expect(metaField.u).toBe(expectedValue?.at);
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
      case CollectionItemType.page:
        expect(parentId).not.toBe(DEFAULT_NOTEBOOK_ID);
        expect(parentType).toBe(CollectionItemType.document);
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
      this.force
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
    for (let i = 0; i < stats.latestVersionsOp.length; i++) {
      expect(versions[i].op).toBe(stats.latestVersionsOp[i]);
    }
    expect(versions).toHaveLength(stats.hasVersions);

    stats.otherHistoryAssert(versions);
  }

  private getStats(type: CollectionItemType, values: PullTestEndStatsItem) {
    const hasContent = isPageOrDocument({ type });
    const defaultValues: MinStatItem = {
      exists: true,
      hasConflict: false,
      isConflictOrphaned: false,
      conflictHasValue: null,
      hasValue: null,
      hasVersions: hasContent ? 1 : 0,
      latestVersionsOp: hasContent ? ['snapshot'] : [],
      otherAssert: () => {},
      otherHistoryAssert: () => {}
    };
    return { ...defaultValues, ...values };
  }
}
