// out of scope: "what happens after conflict" or longer push pull sequences -> to other files

import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { LocalChangeType } from '@/db/types/store-types';
import { oneNotebook } from '@/vitest/setup/test.utils';
import { it } from 'vitest';
import { PullTestScenario, PullTestScenarioRunner } from './scenario-runner';
import {
  reInitRemoteData,
  syncService_pull,
  testSyncAfterEach,
  testSyncBeforeEach
} from './test-sync.utils';

const scenarioMatrix: {
  [key: string]: {
    label: string;
    types?: CollectionItemTypeValues[];
    skip?: boolean;
    scenarios: PullTestScenario[];
  };
} = {
  // should cover single pull only
  // also, force pull
  itemAdded: {
    label: '[item-added]',
    scenarios: [
      {
        description:
          'item added locally, unchanged on remote → local add persists',
        changesBeforePull: [
          {
            change: LocalChangeType.add,
            where: 'local'
          }
        ],
        endStats: b =>
          b
            .theItem({ exists: true, hasConflict: false })
            .ifPage()
            .itsParent({ hasVersions: 2 })
            // force pull: item is deleted
            .ifForce()
            .theItem({ exists: false })
            .itsParent({ exists: false })
            .ifPage()
            .theItem({
              hasVersions: 2,
              latestVersionsOp: ['deleted', 'snapshot']
            })
            .itsParent({
              hasVersions: 3,
              latestVersionsOp: ['deleted', 'snapshot']
            })
            .ifDocument()
            .theItem({
              hasVersions: 2,
              latestVersionsOp: ['deleted', 'snapshot']
            })
            .itsParent({ exists: true }) // still exists because is default notebook!
            .ifFolder()
            .itsParent({ exists: true })
      },
      {
        description:
          'item inexistent locally, added on remote → remote item pulled',
        changesBeforePull: [
          {
            change: LocalChangeType.add,
            where: 'remote'
          }
        ],
        endStats: b => b.theItem({ exists: true, hasConflict: false }) // even if page, parent doc has 1 version
      }
      // ...generateForFields...
    ]
  },
  itemDeletedLocally: {
    label: '[item deleted locally]',
    scenarios: [
      {
        description:
          'item deleted locally, unchanged on remote → item stays deleted (local wins)',
        initLocalData: [{ id: '#id' }],
        initRemoteData: [{ id: '#id' }],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.delete, where: 'local' }
        ],
        endStats: b =>
          b
            .theItem({ exists: false })
            .itsParent({ exists: true })
            .ifDocument()
            .theItem({
              hasVersions: 2,
              latestVersionsOp: ['deleted', 'snapshot']
            })
            .ifPage()
            .theItem({
              hasVersions: 2,
              latestVersionsOp: ['deleted', 'snapshot']
            })
            .itsParent({
              exists: true,
              hasVersions: 3,
              otherHistoryAssert: versions => {
                expect(versions[0].pageVersionsArrayJson).toBeUndefined();
                expect(versions[1].pageVersionsArrayJson).toHaveLength(1);
              }
            })
            // if force pull, item pulled
            .ifForce()
            .theItem({ exists: true })
            .ifDocument()
            .theItem({
              hasVersions: 3,
              latestVersionsOp: ['snapshot', 'deleted', 'snapshot']
            })
            .ifPage()
            .theItem({
              hasVersions: 3,
              latestVersionsOp: ['snapshot', 'deleted', 'snapshot']
            })
            .itsParent({
              hasVersions: 4
            })
      },
      {
        description:
          'item deleted locally, then deleted on remote → both win, item gone',
        initLocalData: [{ id: '#id' }],
        initRemoteData: [{ id: '#id' }],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.delete, where: 'local' },
          { id: '#id', change: LocalChangeType.delete, where: 'remote' }
        ],
        endStats: b =>
          b
            .theItem({ exists: false })
            .itsParent({ exists: true })
            .ifDocument()
            .theItem({
              hasVersions: 2,
              latestVersionsOp: ['deleted', 'snapshot']
            })
            .ifPage()
            .theItem({
              hasVersions: 2,
              latestVersionsOp: ['deleted', 'snapshot']
            })
            .itsParent({
              exists: true,
              hasVersions: 3,
              otherHistoryAssert: versions => {
                expect(versions[0].pageVersionsArrayJson).toBeUndefined();
                expect(versions[1].pageVersionsArrayJson).toHaveLength(1);
              }
            })
      }
    ]
  }
};

const allTypes = [
  { type: CollectionItemType.document, typeName: 'document' },
  { type: CollectionItemType.page, typeName: 'page' },
  { type: CollectionItemType.folder, typeName: 'folder' },
  { type: CollectionItemType.notebook, typeName: 'notebook' }
];

describe('on pull operation tests', () => {
  beforeEach(testSyncBeforeEach);
  afterEach(testSyncAfterEach);

  describe(`simple/merge pull`, () => {
    Object.keys(scenarioMatrix).forEach(key => {
      const category = scenarioMatrix[key];
      if (category.skip === true) return;
      describe(`${category.label}`, () => {
        allTypes.forEach(({ type, typeName }) => {
          if (category.types && !category.types.find(t => t === type)) {
            return;
          }
          describe(`changes on a single ${typeName}`, () => {
            category.scenarios.forEach(scenario => {
              const desc = scenario.description.replaceAll('item', typeName);
              const skip =
                scenario.skip !== undefined ? scenario.skip(type) : false;
              if (skip) return;
              if (!scenario.types || scenario.types.find(t => t === type)) {
                it(`Pull: ${desc}`, async () => {
                  const runner = new PullTestScenarioRunner(scenario, type)
                    .withLocalData()
                    .withRemoteData()
                    .applyTestChangesInOrder();
                  // pull
                  await syncService_pull();
                  // assert stats
                  runner.assertStats();
                  runner.assertHistoryStats();
                });
              }
            });
          });
        });
      });
    });
    // 'with children' tests after
  });

  describe('force pull', () => {
    beforeEach(() => {
      reInitRemoteData([oneNotebook()]);
    });

    Object.keys(scenarioMatrix).forEach(key => {
      const category = scenarioMatrix[key];
      if (category.skip === true) return;
      describe(`${category.label}`, () => {
        allTypes.forEach(({ type, typeName }) => {
          if (category.types?.find(t => t === type)) {
            return;
          }
          describe(`changes on a single ${typeName}`, () => {
            category.scenarios
              .filter(s => s.skipForcePull !== true)
              .forEach(scenario => {
                const desc = scenario.description.replaceAll('item', typeName);
                const skip =
                  scenario.skip !== undefined ? scenario.skip(type) : false;
                if (skip) return;
                if (!scenario.types || scenario.types.find(t => t === type)) {
                  it(`Force Pull: ${desc}`, async () => {
                    const runner = new PullTestScenarioRunner(
                      scenario,
                      type,
                      true
                    )
                      .withLocalData()
                      .withRemoteData()
                      .applyTestChangesInOrder();
                    // pull
                    await syncService_pull(true);
                    // assert stats
                    runner.assertStats();
                    runner.assertHistoryStats();
                  });
                }
              });
          });
        });
      });
    });
  });
});
