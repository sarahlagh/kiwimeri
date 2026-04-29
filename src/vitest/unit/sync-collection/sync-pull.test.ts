// out of scope: "what happens after conflict" or longer push pull sequences -> to other files

import { CollectionItemType } from '@/collection/collection';
import { oneNotebook } from '@/vitest/setup/test.utils';
import { afterEach, beforeEach, describe, it } from 'vitest';
import { PullTestScenarioRunner } from './scenario-runner';
import { scenarioMatrix } from './sync-pull.matrix';
import {
  reInitRemoteData,
  syncService_sync,
  testSyncAfterEach,
  testSyncBeforeEach
} from './test-sync.utils';

const allTypes = [
  { type: CollectionItemType.document, typeName: 'document' },
  { type: CollectionItemType.page, typeName: 'page' },
  { type: CollectionItemType.folder, typeName: 'folder' },
  { type: CollectionItemType.notebook, typeName: 'notebook' }
];

function generateTestSuite(
  force: boolean,
  callback: () => Promise<any>,
  id?: string
) {
  Object.keys(scenarioMatrix).forEach(key => {
    const category = scenarioMatrix[key];

    if (category.skip === true) return;
    if (force && category.skipForcePull === true) return;
    describe(`${category.label}`, () => {
      allTypes.forEach(({ type, typeName }) => {
        if (category.types && !category.types.find(t => t === type)) {
          return;
        }
        describe(`changes on a single ${typeName}`, () => {
          category.scenarios.forEach(scenario => {
            if (id && scenario.id !== id) return;
            if (force === true && scenario.skipForcePull === true) return;
            if (scenario.types && !scenario.types.find(t => t === type)) return;
            if (scenario.skip === true) return;

            const prefix = force ? 'Force Pull' : 'Pull/Push';
            const desc = scenario.description.replaceAll('item', typeName);

            if (scenario.fields && scenario.fields.length > 0) {
              describe(`${prefix}: ${desc}`, () => {
                // loop over fields
                scenario.fields!.forEach(f => {
                  // TODO check field applicable for type
                  it(`${prefix}: type: ${typeName} / field: ${f.field}`, async () => {
                    const runner = await new PullTestScenarioRunner(
                      scenario,
                      type,
                      force
                    )
                      .withTestField(f)
                      .withLocalData()
                      .withRemoteData();

                    runner.applyTestChangesInOrder();
                    // pull
                    const resp = await callback();
                    // assert stats
                    runner.assertStats();
                    runner.assertHistoryStats();
                    await runner.assertRemote(resp, force);
                  });
                });
              });
            } else {
              // simple test without loop
              it(`${prefix}: ${desc}`, async () => {
                const runner = await new PullTestScenarioRunner(
                  scenario,
                  type,
                  force
                )
                  .withLocalData()
                  .withRemoteData();
                runner.applyTestChangesInOrder();
                // pull
                const resp = await callback();
                // assert stats
                runner.assertStats();
                runner.assertHistoryStats();
                await runner.assertRemote(resp, force);
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
    generateTestSuite(false, () => syncService_sync('sync'));
  });

  describe('force pull', () => {
    beforeEach(() => {
      reInitRemoteData([oneNotebook()]);
    });
    generateTestSuite(true, () => syncService_sync('force-pull'));
  });
});
