import { Capacitor } from '@capacitor/core';
import { Store as UntypedStore } from 'tinybase';
import { Persister } from 'tinybase/persisters';
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db';
import { NoSchemas, Store } from 'tinybase/with-schemas';
import { createAndroidFSBackupPersister } from './native-android-persister';
import { createElectronFSBackupPersister } from './native-electron-persister';

export function createNativeDbPersister(
  _store: Store<NoSchemas>,
  name: string,
  excludeTables: string[] = []
) {
  let native: Persister | null = null;
  if (Capacitor.getPlatform() === 'android') {
    native = createAndroidFSBackupPersister(
      _store as unknown as UntypedStore,
      name,
      excludeTables
    );
  }
  if (Capacitor.getPlatform() === 'electron') {
    native = createElectronFSBackupPersister(
      _store as unknown as UntypedStore,
      name,
      excludeTables
    );
  }
  return {
    main: createIndexedDbPersister(_store as unknown as UntypedStore, name),
    native
  };
}
