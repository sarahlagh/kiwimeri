import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import localChangesService from '@/domain/synchronization/local-changes/local-changes.service';
import { useHasLocalChanges } from '@/features/local-changes-ui';
import { wrappedRenderHook } from '@@/_setup/test.utils';
import { testSyncAfterEach, testSyncBeforeEach } from './test-sync.utils';

describe(`sync indicators test`, () => {
  beforeEach(testSyncBeforeEach);
  afterEach(testSyncAfterEach);

  it('should tell if there is no local change', () => {
    act(() => {
      localChangesService.clear();
    });
    const { result } = wrappedRenderHook(() => useHasLocalChanges());
    expect(result.current).toBeFalsy();
  });

  it('should tell if there is are local changes', () => {
    // by default a new notebook is created
    expect(localChangesService.getLocalChanges()).toHaveLength(1);
    const { result } = wrappedRenderHook(() => useHasLocalChanges());
    expect(result.current).toBeTruthy();
  });
});
