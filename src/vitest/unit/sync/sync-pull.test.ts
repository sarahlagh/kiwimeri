// out of scope: "what happens after conflict" or longer push pull sequences -> to other files

import {
  CollectionItemType,
  CollectionItemTypeValues,
  parseFieldMeta
} from '@/collection/collection';
import { LocalChangeType } from '@/db/types/store-types';
import {
  allFields,
  allHistorizableFields,
  conflictFields,
  nonConflictFields,
  oneNotebook,
  orderField,
  parentField,
  titleField
} from '@/vitest/setup/test.utils';
import { it } from 'vitest';
import { PullTestScenario, PullTestScenarioRunner } from './scenario-runner';
import {
  reInitRemoteData,
  syncService_pull,
  testSyncAfterEach,
  testSyncBeforeEach
} from './test-sync.utils';

// covers single pull/force pull only
const scenarioMatrix: {
  [key: string]: {
    label: string;
    types?: CollectionItemTypeValues[];
    skip?: boolean;
    scenarios: PullTestScenario[];
  };
} = {
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
      },
      {
        description:
          'item added locally, added on remote with different content → ?',
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [titleField],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.add,
            where: 'local',
            applyInitValue: true
          }
        ],
        endStats: b =>
          b
            .theItem({
              hasValue: null,
              otherAssert: (item, relevantItem) => {
                expect(item?.title).toBe(relevantItem?.initValue?.value);
                const json = item?.title_meta;
                expect(json).toBeDefined();
                // slightly weird but acceptable for this scenario
                const metaField = parseFieldMeta(json as string);
                expect(metaField.u).not.toBe(relevantItem?.initValue?.at);
              }
            })
            .ifPage()
            .itsParent({ hasVersions: 2 })
            .ifForce()
            .theItem({
              otherAssert: () => {},
              hasValue: 'init'
            })
      }
    ]
  },
  itemDeletedLocallyFirst: {
    label: '[item deleted locally first]',
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
      },
      {
        skipForcePull: true,
        description:
          'item deleted locally, then updated on remote (any field) → remote wins, item exists with remote state',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...allFields],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.delete, where: 'local' },
          { id: '#id', change: LocalChangeType.update, where: 'remote' }
        ],
        endStats: b =>
          b
            .theItem({
              hasValue: 'remote'
            })
            .ifDocument()
            .theItem({ hasVersions: 3 })
            .ifPage()
            .theItem({ hasVersions: 3 })
            .itsParent({ hasVersions: 4 })
      },
      {
        skipForcePull: true,
        description:
          'item deleted locally, then moved on remote → remote wins, item exists with remote state',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [parentField],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.delete, where: 'local' },
          { id: '#id', change: LocalChangeType.update, where: 'remote' }
        ],
        endStats: b =>
          b
            .theItem({
              hasValue: 'remote'
            })
            .ifDocument()
            .theItem({ hasVersions: 3 })
            .ifPage()
            .theItem({ hasVersions: 3 })
            .itsParent({
              hasVersions: 1,
              otherHistoryAssert: versions => {
                expect(versions[0].pageVersionsArrayJson).toHaveLength(1);
              }
            })
            .itsOldParent({
              hasVersions: 3,
              latestVersionsOp: ['snapshot', 'snapshot', 'snapshot'],
              otherHistoryAssert: versions => {
                // check latest version doesn't have page
                expect(versions[0].pageVersionsArrayJson).toBeUndefined();
              }
            })
      }
    ]
  },
  itemDeletedLocallySecond: {
    label: '[item deleted locally second]',
    scenarios: [
      {
        description:
          'item updated on remote (any field), then deleted locally → item stays deleted (local wins)',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...allFields],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.update, where: 'remote' },
          { id: '#id', change: LocalChangeType.delete, where: 'local' }
        ],
        endStats: b =>
          b
            .theItem({
              exists: false
            })
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
              hasVersions: 3
            })
            .ifForce()
            .theItem({ exists: true })
            .ifDocument()
            .theItem({ hasVersions: 3, latestVersionsOp: ['snapshot'] })
            .ifPage()
            .theItem({ hasVersions: 3, latestVersionsOp: ['snapshot'] })
            .itsParent({ hasVersions: 4 })
      },
      {
        description:
          'item moved on remote, then deleted locally → item stays deleted (local wins)',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [parentField],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.update, where: 'remote' },
          { id: '#id', change: LocalChangeType.delete, where: 'local' }
        ],
        endStats: b =>
          b
            .theItem({
              exists: false
            })
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
              hasVersions: 1
            })
            .itsOldParent({
              hasVersions: 3
            })
            .ifForce()
            .theItem({ exists: true })
            .ifDocument()
            .theItem({ hasVersions: 3, latestVersionsOp: ['snapshot'] })
            .ifPage()
            .theItem({ hasVersions: 3, latestVersionsOp: ['snapshot'] })
            .itsParent({ hasVersions: 1 })
            .itsOldParent({ hasVersions: 3 })
      }
    ]
  },
  itemDeletedRemotelyFirst: {
    label: '[item deleted remotely first]',
    scenarios: [
      {
        description:
          'item deleted remotely, then deleted locally → both win, item gone',
        initLocalData: [{ id: '#id' }],
        initRemoteData: [{ id: '#id' }],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.delete, where: 'remote' },
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
      },
      {
        description:
          'item deleted on remote, then updated locally on HISTORIZABLE field → local wins, item stays',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...allHistorizableFields],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.delete, where: 'remote' },
          { id: '#id', change: LocalChangeType.update, where: 'local' }
        ],
        endStats: b =>
          b
            .theItem({
              hasValue: 'local'
            })
            .ifDocument()
            .theItem({ hasVersions: 2 })
            .ifPage()
            .theItem({ hasVersions: 2 })
            .itsParent({ hasVersions: 3 })
            .ifForce()
            .theItem({ exists: false, hasValue: null })
            .ifDocument()
            .theItem({ hasVersions: 3, latestVersionsOp: ['deleted'] })
            .ifPage()
            .theItem({ hasVersions: 3, latestVersionsOp: ['deleted'] })
            .itsParent({ hasVersions: 4 })
      },
      {
        types: ['d', 'p'],
        description:
          'item deleted on remote, then updated locally on order field → local wins, item stays',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [orderField],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.delete, where: 'remote' },
          { id: '#id', change: LocalChangeType.update, where: 'local' }
        ],
        endStats: b =>
          b
            .theItem({
              hasValue: 'local'
            })
            .ifDocument()
            .theItem({ hasVersions: 1 })
            .ifPage() // for page, order is a historizable field
            .theItem({ hasVersions: 2 })
            .itsParent({ hasVersions: 3 })
            .ifForce()
            .theItem({ exists: false, hasValue: null })
            .ifDocument()
            .theItem({ hasVersions: 2, latestVersionsOp: ['deleted'] })
            .ifPage()
            .theItem({ hasVersions: 3, latestVersionsOp: ['deleted'] })
            .itsParent({ hasVersions: 4 })
      },
      {
        types: ['d', 'f', 'n'], // pages cannot be moved
        description:
          'item deleted on remote, then moved locally → local wins, item stays',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [parentField],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.delete, where: 'remote' },
          { id: '#id', change: LocalChangeType.update, where: 'local' }
        ],
        endStats: b =>
          b
            .theItem({
              hasValue: 'local'
            })
            .ifDocument()
            .theItem({ hasVersions: 1 })
            .ifForce()
            .theItem({ hasValue: null, exists: false })
            .itsParent({ exists: false }) // for doc, new parent only existed locally without push
            .itsOldParent({ exists: true })
            .ifDocument()
            .theItem({ hasVersions: 2, latestVersionsOp: ['deleted'] })
      },
      {
        description:
          'item unchanged locally, deleted on remote → item deleted (remote wins)',
        initLocalData: [{ id: '#id' }],
        initRemoteData: [{ id: '#id' }],
        changesBeforePull: [
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
  },
  itemDeletedRemotelySecond: {
    label: '[item deleted remotely second]',
    scenarios: [
      {
        types: ['d', 'p'],
        description:
          'item updated locally (CONFLICT field), then deleted on remote → conflict created',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...conflictFields],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.update, where: 'local' },
          { id: '#id', change: LocalChangeType.delete, where: 'remote' }
        ],
        endStats: b =>
          b
            .theItem({
              exists: false,
              hasConflict: true,
              conflictHasValue: 'local',
              hasVersions: 3,
              latestVersionsOp: ['deleted', 'snapshot', 'snapshot']
            })
            .ifPage()
            .itsParent({ hasVersions: 4 })
            .ifForce()
            .theItem({
              hasConflict: false
            })
      },
      {
        types: ['n', 'f'],
        description:
          'item updated locally (CONFLICT field), then deleted on remote → local change lost, item deleted (remote wins)',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...conflictFields],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.update, where: 'local' },
          { id: '#id', change: LocalChangeType.delete, where: 'remote' }
        ],
        endStats: b =>
          b.theItem({
            exists: false
          })
      },
      {
        description:
          'item updated locally (NON-CONFLICT field), then deleted on remote → local change lost, item deleted (remote wins)',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...nonConflictFields],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.update, where: 'local' },
          { id: '#id', change: LocalChangeType.delete, where: 'remote' }
        ],
        endStats: b =>
          b
            .theItem({
              exists: false
            })
            .ifDocument()
            .theItem({
              hasVersions: 3,
              latestVersionsOp: ['deleted', 'snapshot', 'snapshot']
            })
            .ifPage()
            .theItem({
              hasVersions: 3,
              latestVersionsOp: ['deleted', 'snapshot', 'snapshot']
            })
            .itsParent({
              hasVersions: 4
            })
      },
      {
        description:
          'item updated locally (order field), then deleted on remote → local change lost, item deleted (remote wins)',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [orderField],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.update, where: 'local' },
          { id: '#id', change: LocalChangeType.delete, where: 'remote' }
        ],
        endStats: b =>
          b
            .theItem({
              exists: false
            })
            .ifDocument()
            .theItem({
              hasVersions: 2,
              latestVersionsOp: ['deleted', 'snapshot'] // non historizable change on doc
            })
            .ifPage()
            .theItem({
              hasVersions: 3,
              latestVersionsOp: ['deleted', 'snapshot', 'snapshot']
            })
            .itsParent({
              hasVersions: 4
            })
      },
      {
        types: ['d'], // pages cannot be moved
        description:
          'item moved locally, then deleted on remote → conflict created',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [parentField],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.update, where: 'local' },
          { id: '#id', change: LocalChangeType.delete, where: 'remote' }
        ],
        endStats: b =>
          b
            .theItem({
              exists: false,
              hasConflict: true,
              conflictHasValue: 'local',
              hasVersions: 2,
              latestVersionsOp: ['deleted', 'snapshot']
            })
            .ifForce()
            .theItem({
              hasConflict: false
            })
            .itsParent({
              exists: false
            })
      }
    ]
  },
  itemUpdatedLocallyFirst: {
    label: '[item updated locally first]',
    scenarios: [
      {
        description:
          'field updated locally on any field, unchanged on remote → local change persists',
        fields: [...allFields],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local'
          }
        ],
        endStats: (b, f) =>
          b
            .theItem({ exists: true, hasValue: 'local' })
            .ifDocument()
            .theItem({ hasVersions: f?.field === 'order' ? 1 : 2 })
            .ifPage()
            .theItem({ hasVersions: 2 })
            .itsParent({ hasVersions: 3 })
            .ifForce()
            .theItem({ hasValue: 'init' })
      },
      {
        description:
          'same field (NON-CONFLICTING) on item updated locally, then remotely with different values → remote change persists',
        fields: [...nonConflictFields, orderField],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote'
          }
        ],
        endStats: (b, f) =>
          b
            .theItem({ hasValue: 'remote' })
            .ifDocument()
            .theItem({ hasVersions: f?.field === 'order' ? 1 : 2 })
            .ifPage()
            .theItem({ hasVersions: 2 })
            .itsParent({ hasVersions: 3 })
      },
      {
        types: ['n', 'f'],
        description:
          'same field (CONFLICTING) on item updated locally, then remotely with different values → remote change persists',
        fields: [...conflictFields],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote'
          }
        ],
        endStats: b => b.theItem({ hasValue: 'remote' })
      },
      {
        types: ['d', 'p'],
        description:
          'same field (CONFLICTING) on item updated locally, then remotely with different values → conflict created',
        fields: [...conflictFields],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote'
          }
        ],
        endStats: b =>
          b
            .theItem({
              hasConflict: true,
              hasValue: 'remote',
              conflictHasValue: 'local'
            })
            .ifDocument()
            .theItem({ hasVersions: 2 })
            .ifPage()
            .theItem({ hasVersions: 2 })
            .itsParent({ hasVersions: 3 })
            .ifForce()
            .theItem({ hasConflict: false })
      }
    ]
  },
  itemUpdatedRemotelyFirst: {
    label: '[item updated remotely first]',
    scenarios: [
      {
        description:
          'field unchanged locally, updated on remote on any field → remote value applied',
        fields: [...allFields],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote'
          }
        ],
        endStats: (b, f) =>
          b
            .theItem({ exists: true, hasValue: 'remote' })
            .ifDocument()
            .theItem({ hasVersions: f?.field === 'order' ? 1 : 2 })
            .ifPage()
            .theItem({ hasVersions: 2 })
            .itsParent({ hasVersions: 3 })
      },
      {
        description:
          'same field (NON-CONFLICTING) on item updated remotely, then locally with different values → local change persists',
        fields: [...nonConflictFields, orderField],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local'
          }
        ],
        endStats: (b, f) =>
          b
            .theItem({ hasValue: 'local' })
            .ifDocument()
            .theItem({ hasVersions: f?.field === 'order' ? 1 : 2 })
            .ifPage()
            .theItem({ hasVersions: 2 })
            .itsParent({ hasVersions: 3 })
            .ifForce()
            .theItem({ hasValue: 'remote' })
      },
      {
        types: ['n', 'f'],
        description:
          'same field (NON-CONFLICTING) on item updated remotely, then locally with different values → local change persists',
        fields: [...conflictFields],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local'
          }
        ],
        endStats: b =>
          b
            .theItem({ hasValue: 'local' })
            .ifForce()
            .theItem({ hasValue: 'remote' })
      },
      {
        types: ['d', 'p'],
        description:
          'same field (CONFLICTING) on item updated remotely, then locally with different values → local change persists',
        fields: [...conflictFields],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local'
          }
        ],
        endStats: b =>
          b
            .theItem({
              hasValue: 'local'
            })
            .ifDocument()
            .theItem({ hasVersions: 2 })
            .ifPage()
            .theItem({ hasVersions: 2 })
            .itsParent({ hasVersions: 3 })
            .ifForce()
            .theItem({ hasValue: 'remote' })
      }
    ]
  },
  itemMovedLocallyFirst: {
    types: ['d', 'f', 'n'], // pages cannot be moved
    label: '[item moved locally first]',
    scenarios: [
      {
        description:
          'item moved locally, unchanged on remote → local move persists',
        fields: [parentField],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local'
          }
        ],
        endStats: b =>
          b
            .theItem({ exists: true, hasValue: 'local' })
            .ifForce()
            .theItem({ hasValue: 'init' })
            .itsParent({ exists: false })
      },
      {
        description:
          'item moved locally, then moved to same parent on remote → remote wins',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentId', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentId', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            data: {
              parent: '#parentId'
            }
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            data: {
              parent: '#parentId'
            }
          }
        ],
        endStats: b =>
          b.theItem({ id: '#id', exists: true, hasValue: 'remote' })
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

function generateTestSuite(force: boolean) {
  Object.keys(scenarioMatrix).forEach(key => {
    const category = scenarioMatrix[key];

    // if (key !== 'itemMovedLocallyFirst') return; // DEBUG
    // category.scenarios.splice(0, category.scenarios.length - 1); // only run last test

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
