import { Capacitor } from '@capacitor/core';
import { Store as UntypedStore } from 'tinybase';
import { Persister } from 'tinybase/persisters';
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db';
import { NoSchemas, Store } from 'tinybase/with-schemas';
import { createElectronFSBackupPersister } from './native-electron-persister';

// TODO WILL need better filesystem plugin for android... :(
// need to figure out what's the problem with imports

export function createNativeDbPersister(
  _store: Store<NoSchemas>,
  name: string,
  excludeTables: string[] = []
) {
  let native: Persister | null = null;
  //   if (Capacitor.getPlatform() === 'android') {
  //     return createAndroidFSBackupPersister(_store, name);
  //   }
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
