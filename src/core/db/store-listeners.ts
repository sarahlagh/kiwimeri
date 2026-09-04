import {
  startDerivedTablesListeners,
  stopDerivedTablesListeners
} from '@/domain/collection/derived-tables-listeners';
import {
  startLocalChangesListeners,
  stopLocalChangesListeners
} from '@/domain/synchronization/local-changes-listeners';
import {
  startStoreChangesListeners,
  stopStoreChangesListeners
} from './native/store-change-listeners';

export function startDbListeners() {
  console.log('[db] starting all listeners');
  startStoreChangesListeners();
  startLocalChangesListeners();
  startDerivedTablesListeners();
}

export function stopDbListeners() {
  console.log('[db] stopping all listeners');
  stopStoreChangesListeners();
  stopLocalChangesListeners();
  stopDerivedTablesListeners();
}

export function disableListeners(callback: () => void) {
  stopDbListeners();
  try {
    callback();
  } finally {
    startDbListeners();
  }
}
