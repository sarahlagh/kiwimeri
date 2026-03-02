import { CollectionItemType } from '@/collection/collection';

export type PullTestEndStatsItem = {
  id?: string;
  exists?: boolean;
  hasConflict?: boolean;
  hasVersions?: number;
  // updateTs?: number;
  // latestVersionOp?: CollectionItemVersionOp;
};

type PullTestEndStatsItemGroup = {
  theItem: PullTestEndStatsItem;
  itsParent?: PullTestEndStatsItem;
  // itsOldParent?: Omit<PullTestEndStatsItem, 'id'>;
  // itsConflict?: Omit<PullTestEndStatsItem, 'id'>;
  // itsChildren?: Omit<PullTestEndStatsItem, 'id'>[];
};

// TODO handle default values
export interface PullTestEndStats {
  // localWins?: boolean;
  // remoteWins?: boolean;
  groups: PullTestEndStatsItemGroup[];
}

export class PullTestEndStatsBuilder {
  private type: CollectionItemType;
  private items: PullTestEndStatsItemGroup[] = [];
  private idx = -1;
  private skip = false;

  public constructor(type: CollectionItemType) {
    this.type = type;
  }
  public theItem(item: PullTestEndStatsItem) {
    if (this.skip) return this;
    this.idx++;
    if (this.items.length <= this.idx) {
      this.items.push({ theItem: {} });
    }
    this.items[this.idx].theItem = { ...item };
    return this;
  }
  public itsParent(item: Partial<PullTestEndStatsItem>) {
    if (this.skip) return this;
    if (this.idx === -1) this.idx++;
    if (this.items.length <= this.idx) {
      throw new Error('error in stats builder: must select an active item');
    } else {
      this.items[this.idx].itsParent = { ...item };
    }
    return this;
  }
  public ifPage() {
    return this.ifType(CollectionItemType.page);
  }
  public ifDocument() {
    return this.ifType(CollectionItemType.document);
  }
  private ifType(type: CollectionItemType) {
    if (this.type === type) {
      this.idx = -1;
    } else {
      this.skip = true;
    }
    return this;
  }
  public build() {
    const finalStats: PullTestEndStats = {
      groups: this.items
    };
    return finalStats;
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
      .build();
    console.debug(example);
    expect(example.groups).toHaveLength(2);
    expect(example.groups[0].theItem).toBeDefined();
    expect(example.groups[0].theItem.id).toBe('r1');
    expect(example.groups[0].itsParent).toBeDefined();
    expect(example.groups[1].theItem).toBeDefined();
    expect(example.groups[1].theItem.id).toBe('r2');
    expect(example.groups[1].itsParent).toBeDefined();
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
      .build();

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
      .build();

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
});
