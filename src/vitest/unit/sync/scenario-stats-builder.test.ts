import {
  CollectionItem,
  CollectionItemType,
  CollectionItemVersion,
  CollectionItemVersionOp
} from '@/collection/collection';
import { SerializableData } from '@/db/types/store-types';
import { parentField, TestField } from '@/vitest/setup/test.utils';

export type PullTestEndStatsItem = {
  id?: string;
  type?: CollectionItemType;
  parent?: string;
  exists?: boolean;
  hasValue?: 'init' | 'local' | 'remote' | null;
  hasConflict?: boolean;
  conflictHasValue?: 'init' | 'local' | 'remote' | null;
  conflictHasParent?: string | null;
  hasVersions?: number;
  latestVersionsOp?: CollectionItemVersionOp[];
  otherAssert?: (item?: CollectionItem, relevantItem?: RelevantItem) => void;
  otherHistoryAssert?: (versions: CollectionItemVersion[]) => void;
};

type PullTestEndStatsItemGroup = {
  theItem: PullTestEndStatsItem;
  itsParent?: PullTestEndStatsItem;
  itsOldParent?: PullTestEndStatsItem;
};

// TODO handle default values
export interface PullTestEndStats {
  groups: Required<PullTestEndStatsItemGroup>[];
}

export type RelevantItem = {
  id: string;
  type: CollectionItemType;
  parentId: string;
  parentType: CollectionItemType;
  parentParentId: string;
  initValue?: {
    value: SerializableData;
    at: number;
  };
  localValue?: {
    value: SerializableData;
    at: number;
  };
  remoteValue?: {
    value: SerializableData;
    at: number;
  };
  from: 'local' | 'remote';
};

export class PullTestEndStatsBuilder {
  private force = false;
  private type: CollectionItemType;
  private items: PullTestEndStatsItemGroup[] = [];
  private testField?: TestField;
  private idx = -1;
  private skip = false;
  private forceOverrideOn = false;

  public constructor(
    type: CollectionItemType,
    testField?: TestField,
    force?: boolean
  ) {
    this.type = type;
    this.testField = testField;
    if (force !== undefined) this.force = force;
  }
  public theItem(item: PullTestEndStatsItem) {
    if (this.skip) return this;
    this.idx++;
    if (this.items.length <= this.idx) {
      this.items.push({ theItem: {} });
    }
    const currentItem = this.items[this.idx].theItem || {};
    this.items[this.idx].theItem = { ...currentItem, ...item };
    return this;
  }
  public itsParent(item: Partial<PullTestEndStatsItem>) {
    if (this.skip) return this;
    if (this.idx === -1) this.idx++;
    if (this.items.length <= this.idx) {
      throw new Error('error in stats builder: must select an active item');
    } else {
      const currentItem = this.items[this.idx].itsParent || {};
      this.items[this.idx].itsParent = { ...currentItem, ...item };
    }
    return this;
  }
  public itsOldParent(item: Partial<PullTestEndStatsItem>) {
    if (this.skip) return this;
    if (this.idx === -1) this.idx++;
    if (this.items.length <= this.idx) {
      throw new Error('error in stats builder: must select an active item');
    } else {
      const currentItem = this.items[this.idx].itsOldParent || {};
      this.items[this.idx].itsOldParent = { ...currentItem, ...item };
    }
    return this;
  }
  public ifForce() {
    this.forceOverrideOn = true;
    if (this.force === true) {
      this.idx = -1;
      this.skip = false;
    } else {
      this.skip = true;
    }
    return this;
  }
  public ifPage() {
    return this.ifType(CollectionItemType.page);
  }
  public ifDocument() {
    return this.ifType(CollectionItemType.document);
  }
  public ifFolder() {
    return this.ifType(CollectionItemType.folder);
  }
  public ifNotebook() {
    return this.ifType(CollectionItemType.notebook);
  }
  private ifType(type: CollectionItemType) {
    if (this.type === type && (!this.forceOverrideOn || this.force === true)) {
      this.idx = -1;
      this.skip = false;
    } else {
      this.skip = true;
    }
    return this;
  }
  public build(
    relevantItems: RelevantItem[],
    forceIds = true
  ): PullTestEndStats {
    const finalStats = {
      groups: this.items
    };
    for (let i = 0; i < finalStats.groups.length; i++) {
      if (i >= relevantItems.length) {
        if (forceIds) {
          throw new Error('error: unable to resolve all ids: ' + i);
        } else {
          break;
        }
      }
      const group = finalStats.groups[i];
      const item = relevantItems[i];
      if (!group.theItem.id) {
        group.theItem.id = item.id;
      }

      let itemParent = item.parentId;
      if (this.testField && this.testField.field === 'parent') {
        // item was moved
        if (!item.localValue && !item.remoteValue) {
          throw new Error('error: unable to resolve new parent');
        }
        let value;
        if (item.localValue && item.remoteValue) {
          value =
            item.localValue.at > item.remoteValue.at
              ? item.localValue
              : item.remoteValue;
        } else if (item.localValue) {
          value = item.localValue;
        } else {
          value = item.remoteValue!;
        }
        const oldParent = item.parentId;
        if (!group.itsOldParent) {
          group.itsOldParent = {
            id: oldParent,
            parent: item.parentParentId // assumes new parent is always under the same parent
          };
        }
        if (!group.itsOldParent.id) {
          group.itsOldParent.id = oldParent;
        }
        if (!group.itsOldParent.parent) {
          group.itsOldParent.parent = item.parentParentId;
        }
        itemParent = value.value as string;
      }

      if (!group.theItem.parent) {
        group.theItem.parent = itemParent;
      }
      if (!group.theItem.type) {
        group.theItem.type = item.type;
      }
      if (!group.itsParent) {
        group.itsParent = {
          id: itemParent,
          parent: item.parentParentId,
          type: item.parentType
        };
      } else if (!group.itsParent!.id) {
        group.itsParent!.id = itemParent;
        group.itsParent!.parent = item.parentParentId;
        group.itsParent!.type = item.parentType;
      }
    }
    return finalStats as PullTestEndStats;
  }
}

describe(`test stats builder`, () => {
  it(`should build stats`, () => {
    const statsBuilder = new PullTestEndStatsBuilder(
      CollectionItemType.document
    );
    const example = statsBuilder
      .theItem({ id: 'r1', exists: true })
      .itsParent({ exists: true })
      .theItem({ id: 'r2', exists: true })
      .itsParent({ exists: true })
      .build([], false);
    console.debug(example);
    expect(example.groups).toHaveLength(2);
    expect(example.groups[0].theItem).toBeDefined();
    expect(example.groups[0].theItem.id).toBe('r1');
    expect(example.groups[0].itsParent).toBeDefined();
    expect(example.groups[1].theItem).toBeDefined();
    expect(example.groups[1].theItem.id).toBe('r2');
    expect(example.groups[1].itsParent).toBeDefined();
  });

  it(`should build stats with latestVersionsOp`, () => {
    const statsBuilder = new PullTestEndStatsBuilder(
      CollectionItemType.document
    );
    const example = statsBuilder
      .theItem({ exists: false })
      .ifDocument()
      .theItem({ latestVersionsOp: ['deleted'] })
      .ifPage()
      .theItem({ latestVersionsOp: ['deleted'] })
      .itsParent({ exists: false, latestVersionsOp: ['deleted'] })
      .build([], false);
    console.debug(example);
    expect(example.groups).toHaveLength(1);
    expect(example.groups[0].theItem).toBeDefined();
    expect(example.groups[0].theItem.latestVersionsOp).toEqual(['deleted']);
  });

  it(`should build stats with type override ignored`, () => {
    const statsBuilder = new PullTestEndStatsBuilder(
      CollectionItemType.document
    );
    const example = statsBuilder
      .theItem({ id: 'r1', exists: true })
      .itsParent({ exists: true })
      .theItem({ id: 'r2', exists: true })
      .itsParent({ exists: true })
      .ifPage()
      .theItem({ id: 'r1', exists: true })
      .itsParent({ hasVersions: 2 })
      .build([], false);

    // .hasField('title', 'r1')
    console.debug(example);
    expect(example.groups).toHaveLength(2);
    expect(example.groups).toHaveLength(2);
    expect(example.groups[0].theItem).toBeDefined();
    expect(example.groups[0].itsParent).toBeDefined();
    expect(example.groups[0].itsParent?.hasVersions).toBeUndefined();
    expect(example.groups[1].theItem).toBeDefined();
    expect(example.groups[1].itsParent).toBeDefined();
  });

  it(`should build stats with type override`, () => {
    const statsBuilder = new PullTestEndStatsBuilder(CollectionItemType.page);
    const example = statsBuilder
      .theItem({ id: 'r1', exists: true })
      .itsParent({ exists: true })
      .theItem({ id: 'r2', exists: true })
      .itsParent({ exists: true })
      .ifPage()
      // .theItem({ id: 'r1' })
      .itsParent({ hasVersions: 2 })
      .build([], false);

    // .hasField('title', 'r1')
    console.debug(example);
    expect(example.groups).toHaveLength(2);
    expect(example.groups).toHaveLength(2);
    expect(example.groups[0].theItem).toBeDefined();
    expect(example.groups[0].itsParent).toBeDefined();
    expect(example.groups[0].itsParent?.hasVersions).toBe(2);
    expect(example.groups[1].theItem).toBeDefined();
    expect(example.groups[1].itsParent).toBeDefined();
  });

  it(`should build stats with force override`, () => {
    const statsBuilder = new PullTestEndStatsBuilder(
      CollectionItemType.document,
      undefined,
      true
    );
    const example = statsBuilder
      .theItem({ exists: true, hasConflict: false })
      .itsParent({ hasVersions: 1 })
      .ifPage()
      .itsParent({ hasVersions: 2 })
      .ifForce()
      .theItem({ exists: false })
      .itsParent({ exists: false })
      .build([], false);

    console.debug(example);
    expect(example.groups).toHaveLength(1);
    expect(example.groups[0].theItem).toBeDefined();
    expect(example.groups[0].theItem.exists).toBe(false);
    expect(example.groups[0].itsParent).toBeDefined();
    expect(example.groups[0].itsParent?.exists).toBe(false);
    expect(example.groups[0].itsParent?.hasVersions).toBe(1);
  });

  it(`should build stats with force override and type override d`, () => {
    const statsBuilder = new PullTestEndStatsBuilder(
      CollectionItemType.document,
      undefined,
      true
    );
    const example = statsBuilder
      .theItem({ exists: true, hasConflict: false })
      .itsParent({ hasVersions: 1 })
      .ifPage()
      .itsParent({ hasVersions: 2 })
      .ifForce()
      .theItem({ exists: false })
      .itsParent({ exists: true })
      .ifPage()
      .itsParent({ exists: false })
      .build([], false);

    console.debug(example);
    expect(example.groups).toHaveLength(1);
    expect(example.groups[0].theItem).toBeDefined();
    expect(example.groups[0].theItem.exists).toBe(false);
    expect(example.groups[0].itsParent).toBeDefined();
    expect(example.groups[0].itsParent?.exists).toBe(true);
    expect(example.groups[0].itsParent?.hasVersions).toBe(1);
  });

  it(`should build stats with force override and type override p`, () => {
    const statsBuilder = new PullTestEndStatsBuilder(
      CollectionItemType.page,
      undefined,
      true
    );
    const example = statsBuilder
      .theItem({ exists: true, hasConflict: false })
      .itsParent({ hasVersions: 1 })
      .ifPage()
      .itsParent({ hasVersions: 2 })
      .ifForce()
      .theItem({ exists: false })
      .itsParent({ exists: true })
      .ifPage()
      .itsParent({ exists: false })
      .build([], false);

    console.debug(example);
    expect(example.groups).toHaveLength(1);
    expect(example.groups[0].theItem).toBeDefined();
    expect(example.groups[0].theItem.exists).toBe(false);
    expect(example.groups[0].itsParent).toBeDefined();
    expect(example.groups[0].itsParent?.exists).toBe(false);
    expect(example.groups[0].itsParent?.hasVersions).toBe(2);
  });

  it(`should resolve ids`, () => {
    const statsBuilder = new PullTestEndStatsBuilder(
      CollectionItemType.document
    );
    const example = statsBuilder
      .theItem({ exists: true, hasConflict: false })
      .itsParent({ hasVersions: 1 })
      .theItem({ exists: true, hasConflict: false })
      .itsParent({ hasVersions: 1 })
      .build([
        {
          id: '1',
          type: CollectionItemType.document,
          parentId: 'p1',
          parentType: CollectionItemType.folder,
          parentParentId: 'root',
          from: 'local'
        },
        {
          id: '2',
          type: CollectionItemType.page,
          parentId: 'p2',
          parentType: CollectionItemType.document,
          parentParentId: 'root',
          from: 'local'
        }
      ]);

    console.debug(example);
    expect(example.groups).toHaveLength(2);
    expect(example.groups[0].theItem).toBeDefined();
    expect(example.groups[0].theItem.exists).toBe(true);
    expect(example.groups[0].theItem.id).toBe('1');
    expect(example.groups[0].theItem.type).toBe(CollectionItemType.document);
    expect(example.groups[0].itsParent).toBeDefined();
    expect(example.groups[0].itsParent?.id).toBe('p1');
    expect(example.groups[0].itsParent.type).toBe(CollectionItemType.folder);

    expect(example.groups[1].theItem).toBeDefined();
    expect(example.groups[1].theItem.exists).toBe(true);
    expect(example.groups[1].theItem.id).toBe('2');
    expect(example.groups[1].theItem.type).toBe(CollectionItemType.page);
    expect(example.groups[1].itsParent).toBeDefined();
    expect(example.groups[1].itsParent?.id).toBe('p2');
    expect(example.groups[1].itsParent.type).toBe(CollectionItemType.document);
  });

  it(`should resolve ids with test field = parent`, () => {
    const statsBuilder = new PullTestEndStatsBuilder(
      CollectionItemType.document,
      parentField
    );
    const example = statsBuilder
      .theItem({ hasVersions: 100 })
      .itsParent({ hasVersions: 1000 })
      .itsOldParent({ hasVersions: 10000 })
      .build([
        {
          id: '1',
          type: CollectionItemType.document,
          parentId: 'p1',
          parentType: CollectionItemType.folder,
          parentParentId: 'root',
          from: 'local',
          remoteValue: {
            at: Date.now() + 99999,
            value: 'new parent'
          }
        }
      ]);

    console.debug(example);
    expect(example.groups).toHaveLength(1);
    expect(example.groups[0].theItem).toBeDefined();
    expect(example.groups[0].theItem.id).toBe('1');
    expect(example.groups[0].theItem.hasVersions).toBe(100);
    expect(example.groups[0].itsParent).toBeDefined();
    expect(example.groups[0].itsParent?.id).toBe('new parent');
    expect(example.groups[0].itsParent.hasVersions).toBe(1000);
    expect(example.groups[0].itsOldParent).toBeDefined();
    expect(example.groups[0].itsOldParent?.id).toBe('p1');
    expect(example.groups[0].itsOldParent.hasVersions).toBe(10000);
  });
});
