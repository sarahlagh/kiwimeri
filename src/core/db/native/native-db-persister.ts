import type { FilesystemService } from '@/core/infra/filesystem.service';
import { plt } from '@/core/infra/platform';
import { Content, Store as UntypedStore } from 'tinybase';
import { createCustomPersister, Persister } from 'tinybase/persisters';
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db';
import { NoSchemas, Store } from 'tinybase/with-schemas';

function removeExcludedTables(content: Content, excludeTables: string[]) {
  excludeTables.forEach(tableId => {
    delete content[0][tableId];
  });
  return content;
}

let filesystemService: FilesystemService | null = null;
export async function loadFsService() {
  if (filesystemService === null) {
    filesystemService = (await import('@/core/infra/filesystem.service'))
      .default;
  }
}

function createNativeFSBackupPersister(
  _store: UntypedStore,
  name: string,
  excludeTables: string[]
) {
  const fileName = `${name}-backup.json`;
  return createCustomPersister(
    _store,
    async () => {
      await loadFsService();
      const content = await filesystemService!.readFile(fileName);
      if (content === null) return undefined;
      return JSON.parse(content);
    },
    async getContent => {
      await loadFsService();
      const content = removeExcludedTables(getContent(), excludeTables);
      await filesystemService!.silentWriteFile(
        fileName,
        JSON.stringify(content),
        'application/json'
      );
    },
    // addPersisterListener: no need for polling the native source
    () => 0,
    // delPersisterListener: nothing to delete
    () => {}
  );
}

export function createNativeDbPersister(
  _store: Store<NoSchemas>,
  name: string,
  excludeTables: string[] = []
) {
  let native: Persister | null = null;
  if (plt.hasNativeSupport()) {
    native = createNativeFSBackupPersister(
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
