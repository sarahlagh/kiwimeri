import {
  CollectionItemTypeValues,
  parseFieldMeta
} from '@/collection/collection';
import { CONFLICTS_NOTEBOOK_ID } from '@/constants';
import { LocalChangeType } from '@/db/types/store-types';
import {
  allFields,
  allHistorizableFields,
  conflictFields,
  contentField,
  nonConflictFields,
  orderField,
  parentField,
  titleField
} from '@/vitest/setup/test.utils';
import { PullTestScenario } from './scenario-runner';

export // covers single pull/force pull only
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
          'same field on item updated locally, then remotely with same value → remote change persists',
        fields: [...allFields],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#value'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#value'
          }
        ],
        endStats: (b, f) =>
          b
            .theItem({ id: '#id', hasValue: 'remote' })
            .ifDocument()
            .theItem({ hasVersions: f?.field === 'order' ? 1 : 2 })
            .ifPage()
            .theItem({ hasVersions: 2 })
            .itsParent({ hasVersions: 3 })
      },
      {
        description:
          'same field (NON-CONFLICTING) on item updated locally, then remotely with different value → remote change persists',
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
          'same field (CONFLICTING) on item updated locally, then remotely with different value → remote change persists',
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
          'same field (CONFLICTING) on item updated locally, then remotely with different value → conflict created',
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
          'same field on item updated remotely, then locally with same value → local change persists',
        fields: [...allFields],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#value'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#value'
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
        description:
          'same field (NON-CONFLICTING) on item updated remotely, then locally with different value → local change persists',
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
          'same field (NON-CONFLICTING) on item updated remotely, then locally with different value → local change persists',
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
          'same field (CONFLICTING) on item updated remotely, then locally with different value → local change persists',
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
            newValue: '#parentId'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentId'
          }
        ],
        endStats: b => b.theItem({ id: '#id', hasValue: 'remote' })
      },
      {
        description:
          'item moved locally to A, then moved remotely to B → conflict',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentA'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentB'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#id',
              hasValue: 'remote'
            })
            .ifDocument()
            .theItem({
              hasConflict: true,
              conflictHasValue: 'local',
              conflictHasParent: '#parentA'
            })
            .ifForce()
            .theItem({ hasConflict: false })
      },
      {
        description:
          'item moved locally to A, then A deleted remotely → orphaned conflict',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentA'
          },
          {
            id: '#parentA',
            change: LocalChangeType.delete,
            where: 'remote'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#id',
              hasConflict: true,
              conflictHasParent: CONFLICTS_NOTEBOOK_ID
            })
            .itsParent({ exists: false }) // #parentA
            .ifForce()
            .theItem({ hasConflict: false, hasValue: 'init' })
      },
      {
        description:
          'item moved locally to A, B deleted locally, then item moved remotely to B → orphaned conflict',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentA'
          },
          {
            id: '#parentB',
            change: LocalChangeType.delete,
            where: 'local'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentB'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#id',
              exists: true,
              hasConflict: true,
              conflictHasParent: CONFLICTS_NOTEBOOK_ID
            })
            .itsParent({
              exists: false // #parentB
            })
            .ifForce()
            .theItem({
              id: '#id',
              exists: true,
              hasValue: 'remote',
              hasConflict: false
            })
            .itsParent({ exists: true })
      },
      {
        description:
          'item moved locally to A, then item moved remotely to B, then B deleted locally → orphaned conflict',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentA'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentB'
          },
          {
            id: '#parentB',
            change: LocalChangeType.delete,
            where: 'local'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#id',
              exists: true,
              hasConflict: true,
              conflictHasParent: CONFLICTS_NOTEBOOK_ID
            })
            .itsParent({
              exists: false // #parentB
            })
            .ifForce()
            .theItem({
              id: '#id',
              exists: true,
              hasValue: 'remote',
              hasConflict: false
            })
            .itsParent({ exists: true })
      }
    ]
  },
  itemMovedRemotelyFirst: {
    types: ['d', 'f', 'n'], // pages cannot be moved
    label: '[item moved remotely first]',
    scenarios: [
      {
        description:
          'item unchanged locally, moved on remote → remote move applied',
        fields: [parentField],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote'
          }
        ],
        endStats: b => b.theItem({ exists: true, hasValue: 'remote' })
      },
      {
        description:
          'item moved remotely, then moved to same parent locally → local wins',
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
            where: 'remote',
            newValue: '#parentId'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentId'
          }
        ],
        endStats: b =>
          b
            .theItem({ id: '#id', hasValue: 'local' })
            .ifForce()
            .theItem({ hasValue: 'remote' })
      },
      {
        description:
          'item moved remotely to A, then moved locally to B → local wins',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentA'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentB'
          }
        ],
        endStats: b =>
          b
            .theItem({ id: '#id', hasValue: 'local' })
            .ifForce()
            .theItem({ hasValue: 'remote' })
      },
      {
        description:
          'item moved remotely to A, then A deleted locally → orphaned conflict',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentA'
          },
          {
            id: '#parentA',
            change: LocalChangeType.delete,
            where: 'local'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#id',
              hasConflict: true,
              conflictHasParent: CONFLICTS_NOTEBOOK_ID
            })
            .itsParent({ exists: false }) // #parentA
            .ifForce()
            .theItem({ hasConflict: false, hasValue: 'remote' })
            .itsParent({ exists: true })
      },
      {
        description:
          'item moved remotely to A, B deleted remotely, then item moved locally to B → orphaned conflict',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentA'
          },
          {
            id: '#parentB',
            change: LocalChangeType.delete,
            where: 'remote'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentB'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#id',
              exists: true,
              hasConflict: true,
              conflictHasParent: CONFLICTS_NOTEBOOK_ID
            })
            .itsParent({
              exists: false // #parentB
            })
            .ifForce()
            .theItem({
              id: '#id',
              hasValue: 'remote',
              hasConflict: false
            })
            .itsOldParent({ exists: true })
      },
      {
        description:
          'item moved remotely to A, then item moved locally to B, then B deleted remotely → orphaned conflict',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentA'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentB'
          },
          {
            id: '#parentB',
            change: LocalChangeType.delete,
            where: 'remote'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#id',
              exists: true,
              hasConflict: true,
              conflictHasParent: CONFLICTS_NOTEBOOK_ID
            })
            .itsParent({
              exists: false // #parentB
            })
            .ifForce()
            .theItem({
              id: '#id',
              exists: true,
              hasValue: 'remote',
              hasConflict: false
            })
      }
    ]
  },
  itemParentDeletedRemotelyFirst: {
    types: ['d', 'f', 'n'], // pages cannot be moved
    label: '[item parent deleted remotely first]',
    scenarios: [
      {
        description:
          'A deleted remotely, then item moved locally to A → orphaned conflict',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#parentA',
            change: LocalChangeType.delete,
            where: 'remote'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentA'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#id',
              exists: true,
              hasConflict: true,
              conflictHasParent: CONFLICTS_NOTEBOOK_ID
            })
            .itsParent({
              exists: false // #parentB
            })
            .ifForce()
            .theItem({
              id: '#id',
              hasValue: 'init',
              hasConflict: false
            })
      },
      {
        description:
          'A deleted remotely, then item moved locally to A, then item moved remotely to B → remote wins',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#parentA',
            change: LocalChangeType.delete,
            where: 'remote'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentA'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentB'
          }
        ],
        endStats: b => b.theItem({ id: '#id', hasValue: 'remote' })
      },
      {
        description:
          'A deleted remotely, then item moved remotely to B, then item moved locally to A → orphaned conflict',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#parentA',
            change: LocalChangeType.delete,
            where: 'remote'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentB'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentA'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#id',
              hasConflict: true,
              conflictHasParent: CONFLICTS_NOTEBOOK_ID
            })
            .itsParent({ exists: false })
            .ifForce()
            .theItem({ hasConflict: false, hasValue: 'remote' })
      }
    ]
  },
  itemParentDeletedLocallyFirst: {
    types: ['d', 'f', 'n'], // pages cannot be moved
    label: '[item parent deleted locally first]',
    scenarios: [
      {
        description:
          'A deleted locally, then item moved remotely to A → orphaned conflict',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#parentA',
            change: LocalChangeType.delete,
            where: 'local'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentA'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#id',
              exists: true,
              hasConflict: true,
              conflictHasParent: CONFLICTS_NOTEBOOK_ID
            })
            .itsParent({
              exists: false // #parentB
            })
            .ifForce()
            .theItem({
              id: '#id',
              hasValue: 'remote',
              hasConflict: false
            })
            .itsParent({ exists: true })
      },
      {
        description:
          'A deleted locally, then item moved remotely to A, then item moved locally to B → local wins',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#parentA',
            change: LocalChangeType.delete,
            where: 'local'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentA'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentB'
          }
        ],
        endStats: b =>
          b
            .theItem({ id: '#id', hasValue: 'local' })
            .ifForce()
            .theItem({ hasValue: 'remote' })
      },
      {
        description:
          'A deleted locally, then item moved locally to B, then item moved remotely to A → orphaned conflict',
        fields: [parentField],
        initLocalData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        initRemoteData: [
          { id: '#id', applyInitValue: true },
          { id: '#parentA', type: 'n' },
          { id: '#parentB', type: 'n' }
        ],
        changesBeforePull: [
          {
            id: '#parentA',
            change: LocalChangeType.delete,
            where: 'local'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'local',
            newValue: '#parentB'
          },
          {
            id: '#id',
            change: LocalChangeType.update,
            where: 'remote',
            newValue: '#parentA'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#id',
              hasConflict: true,
              conflictHasParent: CONFLICTS_NOTEBOOK_ID
            })
            .itsParent({ exists: false })
            .ifForce()
            .theItem({ hasConflict: false, hasValue: 'remote' })
            .itsParent({ exists: true })
      }
    ]
  },
  documentWithPagesMoved: {
    types: ['d'],
    label: '[document with pages moved]',
    scenarios: [
      {
        description:
          'document moved locally, document + pages unchanged on remote → local move persists, pages stay with document',
        fields: [parentField],
        initLocalData: [
          { id: '#doc', applyInitValue: true },
          { id: '#page1', type: 'p', parent: '#doc' }
        ],
        initRemoteData: [
          { id: '#doc', applyInitValue: true },
          { id: '#page1', type: 'p', parent: '#doc' }
        ],
        changesBeforePull: [
          {
            id: '#doc',
            change: LocalChangeType.update,
            where: 'local'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#page1',
              otherAssert: item => {
                expect(item?.parent).toBe('#doc');
              }
            })
            .itsParent({
              hasValue: 'local',
              hasVersions: 2
            })
            .ifForce()
            .itsParent({
              hasValue: 'init'
            })
      },
      {
        description:
          'document with pages unchanged locally, document moved on remote → remote move applied, pages follow',
        fields: [parentField],
        initLocalData: [
          { id: '#doc', applyInitValue: true },
          { id: '#page1', type: 'p', parent: '#doc' }
        ],
        initRemoteData: [
          { id: '#doc', applyInitValue: true },
          { id: '#page1', type: 'p', parent: '#doc' }
        ],
        changesBeforePull: [
          {
            id: '#doc',
            change: LocalChangeType.update,
            where: 'remote'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#page1',
              otherAssert: item => {
                expect(item?.parent).toBe('#doc');
              }
            })
            .itsParent({
              hasValue: 'remote',
              hasVersions: 2
            })
      },
      {
        description:
          'document moved locally, its page also updated on remote (different field) → doc in local parent, page has remote update',
        fields: [parentField],
        initLocalData: [
          { id: '#doc', applyInitValue: true },
          { id: '#page1', type: 'p', parent: '#doc' }
        ],
        initRemoteData: [
          { id: '#doc', applyInitValue: true },
          { id: '#page1', type: 'p', parent: '#doc' }
        ],
        changesBeforePull: [
          {
            id: '#doc',
            change: LocalChangeType.update,
            where: 'local'
          },
          {
            id: '#page1',
            change: LocalChangeType.update,
            forceField: contentField,
            where: 'remote'
          }
        ],
        endStats: b =>
          b
            .theItem({
              id: '#page1',
              hasValue: 'remote',
              hasVersions: 2,
              otherAssert: item => {
                expect(item?.parent).toBe('#doc');
                const initTs = parseFieldMeta(item!.parent_meta).u;
                const contentTs = parseFieldMeta(item!.content_meta!).u;
                expect(contentTs).toBeGreaterThan(initTs);
              }
            })
            .itsParent({
              hasValue: 'local',
              hasVersions: 3,
              otherHistoryAssert: versions => {
                expect(versions[0].pageVersionsArrayJson).toHaveLength(1);
                expect(versions[1].pageVersionsArrayJson).toHaveLength(1);
                const pageVersion0 = versions[0].pageVersionsArrayJson![0];
                const pageVersion1 = versions[1].pageVersionsArrayJson![0];
                expect(pageVersion0.id).not.toBe(pageVersion1.id);
              }
            })
            .ifForce()
            .itsParent({
              hasValue: 'init'
            })
      }
    ]
  }
  //   itemWithMultipleChanges: {
  //     label: '',
  //     scenarios: []
  //   }
};
