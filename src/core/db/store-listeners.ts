import {
  startAnnotsListeners,
  stopAnnotsListeners
} from '@/domain/document-annotations/listeners';
import {
  startLocalChangesListeners,
  stopLocalChangesListeners
} from '@/domain/local-changes/listeners';

export function startListeners() {
  console.log('[db] starting all listeners');
  startLocalChangesListeners();
  startAnnotsListeners();
}

export function stopListeners() {
  console.log('[db] stopping all listeners');
  stopLocalChangesListeners();
  stopAnnotsListeners();
}

export function disableListeners(callback: () => void) {
  stopListeners();
  callback();
  startListeners();
}
