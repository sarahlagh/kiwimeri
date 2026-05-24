import {
  startLocalChangesListeners,
  stopLocalChangesListeners
} from '@/domain/local-changes/listeners';

export function startListeners() {
  console.log('[db] starting all listeners');
  startLocalChangesListeners();
}

export function stopListeners() {
  console.log('[db] stopping all listeners');
  stopLocalChangesListeners();
}

export function disableListeners(callback: () => void) {
  stopListeners();
  callback();
  startListeners();
}
