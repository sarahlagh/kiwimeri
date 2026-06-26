import { syncService } from '@/domain/replication/sync.service';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import localChangesService from '@/domain/local-changes/local-changes.service';
import { wrappedRenderHook } from '@@/_setup/test.utils';
import { testSyncAfterEach, testSyncBeforeEach } from './test-sync.utils';

describe(`sync indicators test`, () => {
  beforeEach(testSyncBeforeEach);
  afterEach(testSyncAfterEach);

  it('should detect if primary remote is connected', () => {
    const { result } = wrappedRenderHook(() =>
      syncService.usePrimaryConnected()
    );
    expect(result.current).toBeTruthy();
  });

  it('should tell if there is no local change', () => {
    act(() => {
      localChangesService.clear();
    });
    const { result } = wrappedRenderHook(() =>
      syncService.usePrimaryHasLocalChanges()
    );
    expect(result.current).toBeFalsy();
  });

  it('should tell if there is are local changes', () => {
    // by default a new notebook is created
    expect(localChangesService.getLocalChanges()).toHaveLength(1);
    const { result } = wrappedRenderHook(() =>
      syncService.usePrimaryHasLocalChanges()
    );
    expect(result.current).toBeTruthy();
  });
});
