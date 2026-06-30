import { CONFLICTS_NOTEBOOK_ID } from '@/constants';
import { MetaField } from '@/core/db/types';
import { CollectionItemTypeValues } from '@/domain/collection/collection';
import { LocalChangeType } from '@/domain/synchronization/local-changes/model';
import {
  allNonHistorizableNonConflictFields,
  allNonParentUpdatableFields,
  conflictFields,
  conflictNonHistorizableFields,
  contentField,
  historizableFields,
  nonConflictFields,
  nonHistorizableFields,
  orderField,
  parentField,
  tagsField,
  titleField
} from '@@/_setup/test.utils';
import { expect } from 'vitest';
import { PullTestScenario } from './scenario-runner';

export // covers single pull/force pull only
const scenarioMatrix: {
  [key: string]: {
    label: string;
    types?: CollectionItemTypeValues[];
    skip?: boolean;
    skipForcePull?: boolean;
    skipForcePush?: boolean;
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
            // force pull: item is deleted
            .ifForcePull()
            .theItem({ exists: false })
            .itsParent({ exists: false })
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
        didPush: false,
        didPull: true,
        changesBeforePull: [
          {
            change: LocalChangeType.add,
            where: 'remote'
          }
        ],
        endStats: b => b.theItem({ exists: true, hasConflict: false })
      },
      {
        description:
          'item added locally, added on remote with different content → ?',
        didPull: true,
        didPush: true,
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
                const metaField = json as MetaField;
                expect(metaField._u).not.toBe(relevantItem?.initValue?.at);
              }
            })
            .ifForcePull()
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
        didPull: false,
        didPush: true,
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
            // if force pull, item pulled
            .ifForcePull()
            .theItem({ exists: true })
            .ifDocument()
            .theItem({
              hasVersions: 3,
              latestVersionsOp: ['snapshot', 'deleted', 'snapshot']
            })
      },
      {
        description:
          'item deleted locally, then deleted on remote → both win, item gone',
        didPush: false,
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
      },
      {
        skipForcePull: true,
        didPush: false,
        description:
          'item deleted locally, then updated on remote (any field) → remote wins, item exists with remote state',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...allNonParentUpdatableFields],
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
      },
      {
        skipForcePull: true,
        didPush: false,
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
        fields: [...allNonParentUpdatableFields],
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
            .ifForcePull()
            .theItem({ exists: true })
            .ifDocument()
            .theItem({ hasVersions: 3, latestVersionsOp: ['snapshot'] })
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
            .ifForcePull()
            .theItem({ exists: true })
            .ifDocument()
            .theItem({ hasVersions: 3, latestVersionsOp: ['snapshot'] })
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
      },
      {
        types: ['d'],
        description:
          'item deleted on remote, then updated locally on HISTORIZABLE field → local wins, item stays',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...historizableFields],
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
            .ifForcePull()
            .theItem({ exists: false, hasValue: null })
            .ifDocument()
            .theItem({ hasVersions: 3, latestVersionsOp: ['deleted'] })
      },
      {
        types: ['d'],
        description:
          'item deleted on remote, then updated locally on NON-HISTORIZABLE field → local wins, item stays',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...nonHistorizableFields],
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
            .ifForcePull()
            .theItem({ exists: false, hasValue: null })
            .ifDocument()
            .theItem({ hasVersions: 2, latestVersionsOp: ['deleted'] })
      },
      {
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
            .ifForcePull()
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
      }
    ]
  },
  itemDeletedRemotelySecond: {
    label: '[item deleted remotely second]',
    scenarios: [
      {
        types: ['d'],
        description:
          'item updated locally (CONFLICT field), then deleted on remote → conflict created',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...conflictFields],
        changesBeforePull: [
          { id: '#id', change: LocalChangeType.update, where: 'local' },
          { id: '#id', change: LocalChangeType.delete, where: 'remote' }
        ],
        endStats: (b, f) =>
          b
            .theItem({
              exists: false,
              hasConflict: true,
              conflictHasValue: 'local',
              hasVersions: f && historizableFields.includes(f) ? 3 : 2,
              latestVersionsOp: ['deleted', 'snapshot']
            })
            .ifForcePull()
            .theItem({
              hasConflict: false
            })
      },
      {
        didPush: false,
        types: ['n', 'f'],
        description:
          'item updated locally (CONFLICT field), then deleted on remote → local change lost, item deleted (remote wins)',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...conflictNonHistorizableFields],
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
        didPush: false,
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
              hasVersions: 2,
              latestVersionsOp: ['deleted', 'snapshot']
            })
      },
      {
        didPush: false,
        description:
          'item updated locally (NON HISTORIZABLE NON CONFLICT field), then deleted on remote → local change lost, item deleted (remote wins)',
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        fields: [...allNonHistorizableNonConflictFields],
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
      },
      {
        types: ['d'],
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
            .ifForcePull()
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
        fields: [...allNonParentUpdatableFields],
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
            .theItem({
              hasVersions: f && historizableFields.includes(f) ? 2 : 1
            })
            .ifForcePull()
            .theItem({ hasValue: 'init' })
      },
      {
        didPush: false,
        description:
          'same field on item updated locally, then remotely with same value → remote change persists',
        fields: [...allNonParentUpdatableFields],
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
            .theItem({
              hasVersions: f && historizableFields.includes(f) ? 2 : 1
            })
      },
      {
        didPush: false,
        description:
          'same field (NON-CONFLICTING) on item updated locally, then remotely with different value → remote change persists',
        fields: [...nonConflictFields],
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
            .theItem({
              hasVersions: f && historizableFields.includes(f) ? 2 : 1
            })
      },
      {
        didPush: false,
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
        types: ['d'],
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
        endStats: (b, f) =>
          b
            .theItem({
              hasConflict: true,
              hasValue: 'remote',
              conflictHasValue: 'local'
            })
            .ifDocument()
            .theItem({
              hasVersions: f && historizableFields.includes(f) ? 2 : 1
            })
            .ifForcePull()
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
        fields: [...allNonParentUpdatableFields],
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
            .theItem({
              hasVersions: f && historizableFields.includes(f) ? 2 : 1
            })
      },
      {
        description:
          'same field on item updated remotely, then locally with same value → local change persists',
        fields: [...allNonParentUpdatableFields],
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
            .theItem({
              hasVersions: f && historizableFields.includes(f) ? 2 : 1
            })
            .ifForcePull()
            .theItem({ hasValue: 'remote' })
      },
      {
        description:
          'same field (NON-CONFLICTING) on item updated remotely, then locally with different value → local change persists',
        fields: [...nonConflictFields],
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
            .theItem({
              hasVersions: f && historizableFields.includes(f) ? 2 : 1
            })
            .ifForcePull()
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
            .ifForcePull()
            .theItem({ hasValue: 'remote' })
      },
      {
        types: ['d'],
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
        endStats: (b, f) =>
          b
            .theItem({
              hasValue: 'local'
            })
            .ifDocument()
            .theItem({
              hasVersions: f && historizableFields.includes(f) ? 2 : 1
            })
            .ifForcePull()
            .theItem({ hasValue: 'remote' })
      }
    ]
  },
  itemMovedLocallyFirst: {
    types: ['d', 'f', 'n'],
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
            .ifForcePull()
            .theItem({ hasValue: 'init' })
            .itsParent({ exists: false })
      },
      {
        didPush: false,
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
        types: ['d'],
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
            .ifForcePull()
            .theItem({ hasConflict: false })
      },
      {
        types: ['f', 'n'],
        didPush: false,
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
            .ifForcePull()
            .theItem({ hasConflict: false })
      },
      {
        types: ['d'],
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
            .ifForcePull()
            .theItem({ hasConflict: false, hasValue: 'init' })
      },
      {
        types: ['f', 'n'],
        didPush: false,
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
            .ifForcePull()
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
            .ifForcePull()
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
            .ifForcePull()
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
    types: ['d', 'f', 'n'],
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
            .ifForcePull()
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
            .ifForcePull()
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
            .ifForcePull()
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
            .ifForcePull()
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
            .ifForcePull()
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
    types: ['d', 'f', 'n'],
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
            .ifForcePull()
            .theItem({
              id: '#id',
              hasValue: 'init',
              hasConflict: false
            })
      },
      {
        types: ['d'],
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
        types: ['f', 'n'],
        description:
          'A deleted remotely, then item moved locally to A, then item moved remotely to B → remote wins',
        didPush: false,
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
            .ifForcePull()
            .theItem({ hasConflict: false, hasValue: 'remote' })
      }
    ]
  },
  itemParentDeletedLocallyFirst: {
    types: ['d', 'f', 'n'],
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
            .ifForcePull()
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
            .ifForcePull()
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
            .ifForcePull()
            .theItem({ hasConflict: false, hasValue: 'remote' })
            .itsParent({ exists: true })
      }
    ]
  },
  itemWithMultipleChanges: {
    label: '[item updated - multiple]',
    scenarios: [
      {
        types: ['f', 'n'],
        description:
          'different fields on item updated locally and remotely → both changes persist',
        fields: [titleField],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            change: LocalChangeType.update,
            where: 'local'
          },
          {
            change: LocalChangeType.update,
            forceField: tagsField,
            where: 'remote'
          }
        ],
        endStats: b =>
          b
            .theItem({
              hasValue: 'remote',
              otherAssert: item => {
                const initTs = item!.parentId_meta._u;
                const titleTs = item!.title_meta._u;
                expect(titleTs).toBeGreaterThan(initTs);
                const tagsTs = item!.tags_meta!._u;
                expect(tagsTs).toBeGreaterThan(titleTs);
              }
            })
            .ifForcePull()
            .theItem({
              otherAssert: item => {
                const initTs = item!.parentId_meta._u;
                const titleTs = item!.title_meta!._u;
                expect(titleTs).toBe(initTs);
                const tagsTs = item!.tags_meta!._u;
                expect(tagsTs).toBeGreaterThan(titleTs);
              }
            })
      },
      {
        types: ['d'],
        description:
          'different fields on item updated locally and remotely → both changes persist',
        fields: [contentField],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            change: LocalChangeType.update,
            where: 'local'
          },
          {
            change: LocalChangeType.update,
            forceField: orderField,
            where: 'remote'
          }
        ],
        endStats: b =>
          b
            .theItem({
              hasValue: 'remote', // order value is pulled
              hasVersions: 2, // if document, order triggers no version
              otherAssert: item => {
                const initTs = item!.parentId_meta._u;
                const contentTs = item!.content_meta!._u;
                expect(contentTs).toBeGreaterThan(initTs);
                const orderTs = item!.order_meta!._u;
                expect(orderTs).toBeGreaterThan(contentTs);
              }
            })
            .ifForcePull()
            .theItem({
              otherAssert: (item, rel) => {
                const initTs = item!.parentId_meta._u;
                const contentTs = item!.content_meta!._u;
                expect(contentTs).toBe(initTs);
                expect(item?.content).toBe(rel?.initValue?.value);
                const orderTs = item!.order_meta!._u;
                expect(orderTs).toBeGreaterThan(contentTs);
              }
            })
      },

      {
        types: ['d'],
        description:
          'multiple fields on item updated locally (one conflicting, one non-conflicting), same fields updated remotely',
        fields: [contentField],
        initLocalData: [{ id: '#id', applyInitValue: true }],
        initRemoteData: [{ id: '#id', applyInitValue: true }],
        changesBeforePull: [
          {
            change: LocalChangeType.update,
            where: 'local'
          },
          {
            change: LocalChangeType.update,
            forceField: orderField,
            where: 'local'
          },
          {
            change: LocalChangeType.update,
            where: 'remote'
          },
          {
            change: LocalChangeType.update,
            forceField: orderField,
            where: 'remote'
          }
        ],
        endStats: b =>
          b
            .theItem({
              hasConflict: true,
              hasVersions: 3, // if document, order triggers no version
              otherAssert: (item, rel) => {
                const initTs = item!.parentId_meta._u;
                const contentTs = item!.content_meta!._u;
                expect(contentTs).toBeGreaterThan(initTs);
                const orderTs = item!.order_meta!._u;
                expect(orderTs).toBeGreaterThan(contentTs);
                expect(item?.order).toBe(rel?.remoteValue?.value);
              }
            })
            .ifForcePull()
            .theItem({ hasConflict: false })
      }
    ]
  }
};
