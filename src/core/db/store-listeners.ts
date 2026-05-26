import {
  startCommentsListeners,
  stopCommentsListeners
} from '@/domain/comments/listeners';
import {
  startLocalChangesListeners,
  stopLocalChangesListeners
} from '@/domain/local-changes/listeners';

export function startListeners() {
  console.log('[db] starting all listeners');
  startLocalChangesListeners();
  startCommentsListeners();
}

export function stopListeners() {
  console.log('[db] stopping all listeners');
  stopLocalChangesListeners();
  stopCommentsListeners();
}

export function disableListeners(callback: () => void) {
  stopListeners();
  callback();
  startListeners();
}
