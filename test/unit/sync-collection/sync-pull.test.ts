// out of scope: "what happens after conflict" or longer push pull sequences -> to other files

import { CollectionItemType } from '@/collection/collection';
import { SyncDirection } from '@/domain/replication/sync.service';
import { oneNotebook } from '@@/_setup/test.utils';
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
  { type: CollectionItemType.folder, typeName: 'folder' },
  { type: CollectionItemType.notebook, typeName: 'notebook' }
];

function generateTestSuite(
  direction: SyncDirection,
  callback: () => Promise<any>,
  id?: string
) {
  const forcePull = direction === 'force-pull';
  const forcePush = direction === 'force-push';
  Object.keys(scenarioMatrix).forEach(key => {
    const category = scenarioMatrix[key];

    if (category.skip === true) return;
    if (forcePull && category.skipForcePull === true) return;
    if (forcePush && category.skipForcePush === true) return;
    describe(`${category.label}`, () => {
      allTypes.forEach(({ type, typeName }) => {
        if (category.types && !category.types.find(t => t === type)) {
          return;
        }
        describe(`changes on a single ${typeName}`, () => {
          category.scenarios.forEach(scenario => {
            if (id && scenario.id !== id) return;
            if (forcePull === true && scenario.skipForcePull === true) return;
            if (forcePush === true && scenario.skipForcePush === true) return;
            if (scenario.types && !scenario.types.find(t => t === type)) return;
            if (scenario.skip === true) return;

            const prefix =
              !forcePull && !forcePush
                ? 'Pull/Push'
                : forcePull
                  ? 'Force Pull'
                  : 'Force Push';
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
                      direction
                    )
                      .withTestField(f)
                      .withLocalData()
                      .withRemoteData();

                    runner.applyTestChangesInOrder();
                    // pull
                    const resp = await callback();
                    // assert stats
                    if (direction !== 'force-push') {
                      runner.assertStats();
                      runner.assertHistoryStats();
                    }
                    await runner.assertRemote(resp);
                  });
                });
              });
            } else {
              // simple test without loop
              it(`${prefix}: ${desc}`, async () => {
                const runner = await new PullTestScenarioRunner(
                  scenario,
                  type,
                  direction
                )
                  .withLocalData()
                  .withRemoteData();
                runner.applyTestChangesInOrder();
                // pull
                const resp = await callback();
                // assert stats
                if (direction !== 'force-push') {
                  runner.assertStats();
                  runner.assertHistoryStats();
                }
                await runner.assertRemote(resp);
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
    generateTestSuite('sync', () => syncService_sync('sync')); //, 'debug');
  });

  describe('force pull', () => {
    beforeEach(() => {
      reInitRemoteData([oneNotebook()]);
    });
    generateTestSuite('force-pull', () => syncService_sync('force-pull'));
  });

  describe('force push', () => {
    beforeEach(() => {
      reInitRemoteData([oneNotebook()]);
    });
    generateTestSuite('force-push', () => syncService_sync('force-push'));
  });
});
