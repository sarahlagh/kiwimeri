// out of scope: "what happens after conflict" or longer push pull sequences -> to other files

import { CollectionItemType } from '@/collection/collection';
import { oneNotebook } from '@/vitest/setup/test.utils';
import { it } from 'vitest';
import { PullTestScenarioRunner } from './scenario-runner';
import { scenarioMatrix } from './sync-pull.matrix';
import {
  reInitRemoteData,
  syncService_pull,
  testSyncAfterEach,
  testSyncBeforeEach
} from './test-sync.utils';

const allTypes = [
  { type: CollectionItemType.document, typeName: 'document' },
  { type: CollectionItemType.page, typeName: 'page' },
  { type: CollectionItemType.folder, typeName: 'folder' },
  { type: CollectionItemType.notebook, typeName: 'notebook' }
];

function generateTestSuite(force: boolean) {
  Object.keys(scenarioMatrix).forEach(key => {
    const category = scenarioMatrix[key];

    if (key !== 'documentWithPagesMoved') return; // DEBUG
    category.scenarios.splice(0, category.scenarios.length - 1); // only run last test

    if (category.skip === true) return;
    describe(`${category.label}`, () => {
      allTypes.forEach(({ type, typeName }) => {
        if (category.types && !category.types.find(t => t === type)) {
          return;
        }
        describe(`changes on a single ${typeName}`, () => {
          category.scenarios.forEach(scenario => {
            if (force === true && scenario.skipForcePull === true) return;
            if (scenario.types && !scenario.types.find(t => t === type)) return;
            if (scenario.skip === true) return;

            const prefix = force ? 'Force Pull' : 'Pull';
            const desc = scenario.description.replaceAll('item', typeName);

            if (scenario.fields && scenario.fields.length > 0) {
              describe(`${prefix}: ${desc}`, () => {
                // loop over fields
                scenario.fields!.forEach(f => {
                  // TODO check field applicable for type
                  it(`${prefix}: type: ${typeName} / field: ${f.field}`, async () => {
                    const runner = new PullTestScenarioRunner(
                      scenario,
                      type,
                      force
                    )
                      .withTestField(f)
                      .withLocalData()
                      .withRemoteData()
                      .applyTestChangesInOrder();
                    // pull
                    await syncService_pull(force);
                    // assert stats
                    runner.assertStats();
                    runner.assertHistoryStats();
                  });
                });
              });
            } else {
              // simple test without loop
              it(`${prefix}: ${desc}`, async () => {
                const runner = new PullTestScenarioRunner(scenario, type, force)
                  .withLocalData()
                  .withRemoteData()
                  .applyTestChangesInOrder();
                // pull
                await syncService_pull(force);
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
}

describe('on pull operation tests', () => {
  beforeEach(testSyncBeforeEach);
  afterEach(testSyncAfterEach);

  describe(`simple/merge pull`, () => {
    generateTestSuite(false);
  });

  describe('force pull', () => {
    beforeEach(() => {
      reInitRemoteData([oneNotebook()]);
    });
    generateTestSuite(true);
  });
});
