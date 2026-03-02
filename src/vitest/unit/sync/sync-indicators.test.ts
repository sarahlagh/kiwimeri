import localChangesService from '@/db/local-changes.service';
import { syncService } from '@/remote-storage/sync.service';
import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { testSyncAfterEach, testSyncBeforeEach } from './test-sync.utils';

describe(`sync indicators test`, () => {
  beforeEach(testSyncBeforeEach);
  afterEach(testSyncAfterEach);

  it('should detect if primary remote is connected', () => {
    const { result } = renderHook(() => syncService.usePrimaryConnected());
    expect(result.current).toBeTruthy();
  });

  it('should tell if there is no local change', () => {
    act(() => {
      localChangesService.clear();
    });
    const { result } = renderHook(() =>
      syncService.usePrimaryHasLocalChanges()
    );
    expect(result.current).toBeFalsy();
  });

  it('should tell if there is are local changes', () => {
    // by default a new notebook is created
    expect(localChangesService.getLocalChanges()).toHaveLength(1);
    const { result } = renderHook(() =>
      syncService.usePrimaryHasLocalChanges()
    );
    expect(result.current).toBeTruthy();
  });
});
