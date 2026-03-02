// out of scope: "what happens after conflict" or longer push pull sequences -> to other files

import { CollectionItemType } from '@/collection/collection';
import { LocalChangeType } from '@/db/types/store-types';
import { it } from 'vitest';
import { PullTestScenario, PullTestScenarioRunner } from './scenario-runner';
import {
  syncService_pull,
  testSyncAfterEach,
  testSyncBeforeEach
} from './test-sync.utils';

const scenarioMatrix: {
  [key: string]: {
    label: string;
    scenarios: PullTestScenario[];
  };
} = {
  // should cover single pull only
  // TODO: also, force pull
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

        // TODO do we need to write the number of versions for each scenario though? could have default values
      }
      // ...generateForFields...
    ]
  }
};

describe('on pull operation tests', () => {
  beforeEach(testSyncBeforeEach);
  afterEach(testSyncAfterEach);

  const allTypes = [
    { type: CollectionItemType.folder, typeName: 'folder' },
    { type: CollectionItemType.document, typeName: 'document' },
    { type: CollectionItemType.page, typeName: 'page' },
    { type: CollectionItemType.notebook, typeName: 'notebook' }
  ];

  // TODO create test builder object which keeps map of created objects, builds real items to send to createInitLocalData & reInitRemoteData, etc.

  Object.keys(scenarioMatrix).forEach(key => {
    const category = scenarioMatrix[key];
    describe(`${category.label}`, () => {
      allTypes.forEach(({ type, typeName }) => {
        describe(`changes on a single ${typeName}`, () => {
          category.scenarios.forEach(scenario => {
            const desc = scenario.description.replaceAll('item', typeName);
            const skip =
              scenario.skip !== undefined ? scenario.skip(type) : false;

            if (
              !scenario.types ||
              scenario.types.find(t => t === type) ||
              skip
            ) {
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

  // TODO 'with children' tests after
});
