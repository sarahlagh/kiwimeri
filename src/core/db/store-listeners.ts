import {
  startDerivedContentListeners,
  stopDerivedContentListeners
} from '@/domain/derived-content/listeners';
import {
  startLocalChangesListeners,
  stopLocalChangesListeners
} from '@/domain/local-changes/listeners';

export function startDbListeners() {
  console.log('[db] starting all listeners');
  startLocalChangesListeners();
  startDerivedContentListeners();
}

export function stopDbListeners() {
  console.log('[db] stopping all listeners');
  stopLocalChangesListeners();
  stopDerivedContentListeners();
}

export function disableListeners(callback: () => void) {
  stopDbListeners();
  callback();
  startDbListeners();
}
