import { appConfig } from '@/config';
import { plt } from '@/core/infra/platform';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import { Id, OptionalSchemas, Store } from 'tinybase/with-schemas';
import { space, spaceArchive, spaceDocContent, store } from '../store';
import { SID } from '../store-constants';
import { TableIdFromSchema } from '../types';

const listeners: [SID, Id][] = [];
const DELAY = appConfig.NATIVE_SAVE_THROTTLE;

function addTablesListener<S extends OptionalSchemas>(
  storeId: SID,
  _store: Store<S>,
  tableIds: TableIdFromSchema<S[0]>[]
) {
  const isMutator = storeId === SID.space; // 'tasks' table is in space
  tableIds.forEach(tableId => {
    const id = _store.addTableListener(
      tableId,
      () => schedule.in(DELAY, TaskNames.NATIVE_STORE_SAVE, { storeId }),
      isMutator
    );
    listeners.push([storeId, id]);
  });
}

export function startStoreChangesListeners() {
  if (!plt.hasNativeSupport()) return;
  addTablesListener(SID.store, store, ['profiles']);
  addTablesListener(SID.space, space, [
    'collection',
    'document_annotation',
    'document_edits',
    'remote',
    'user_preference'
  ]);
  addTablesListener(SID.spaceDocContent, spaceDocContent, [
    'collection_content',
    'document_annotation_content'
  ]);
  addTablesListener(SID.spaceArchive, spaceArchive, ['history']);

  const id = space.addValuesListener(
    () =>
      schedule.in(DELAY, TaskNames.NATIVE_STORE_SAVE, { storeId: SID.space }),
    true
  );
  listeners.push([SID.space, id]);
}

export function stopStoreChangesListeners() {
  listeners.forEach(([s, l]) => {
    switch (s) {
      case 'store':
        store.delListener(l);
        break;
      case 'space':
        space.delListener(l);
        break;
      case 'spaceArchive':
        spaceArchive.delListener(l);
        break;
      case 'spaceDocContent':
        spaceDocContent.delListener(l);
    }
  });
  listeners.length = 0;
}
