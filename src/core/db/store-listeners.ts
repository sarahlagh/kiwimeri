import {
  startAnnotsListeners,
  stopAnnotsListeners
} from '@/domain/document-annotations/listeners';
import {
  startLocalChangesListeners,
  stopLocalChangesListeners
} from '@/domain/local-changes/listeners';

export function startDbListeners() {
  console.log('[db] starting all listeners');
  startLocalChangesListeners();
  startAnnotsListeners();
}

export function stopDbListeners() {
  console.log('[db] stopping all listeners');
  stopLocalChangesListeners();
  stopAnnotsListeners();
}

export function disableListeners(callback: () => void) {
  stopDbListeners();
  callback();
  startDbListeners();
}
