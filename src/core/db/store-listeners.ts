import {
  startDerivedTablesListeners,
  stopDerivedTablesListeners
} from '@/domain/collection/derived-tables-listeners';
import {
  startLocalChangesListeners,
  stopLocalChangesListeners
} from '@/domain/synchronization/local-changes-listeners';

export function startDbListeners() {
  console.log('[db] starting all listeners');
  startLocalChangesListeners();
  startDerivedTablesListeners();
}

export function stopDbListeners() {
  console.log('[db] stopping all listeners');
  stopLocalChangesListeners();
  stopDerivedTablesListeners();
}

export function disableListeners(callback: () => void) {
  stopDbListeners();
  callback();
  startDbListeners();
}
