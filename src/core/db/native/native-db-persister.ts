import type { FilesystemService } from '@/core/infra/filesystem.service';
import { plt } from '@/core/infra/platform';
import { Content, Store as UntypedStore } from 'tinybase';
import { createCustomPersister, Persister } from 'tinybase/persisters';
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db';
import { NoSchemas, Store } from 'tinybase/with-schemas';

export function removeExcludedTables(
  content: Content,
  excludeTables: string[]
) {
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
  const tmpFileName = `${fileName}.tmp`;
  return createCustomPersister(
    _store,
    async () => {
      await loadFsService();
      const content = await filesystemService!.readFile(fileName);
      if (content === null) {
        console.log('no native backup found', fileName);
        return undefined;
      }
      console.log('native backup found', fileName);
      return JSON.parse(content);
    },
    async getContent => {
      await loadFsService();
      const content = removeExcludedTables(getContent(), excludeTables);
      const { success } = await filesystemService!.silentWriteFile(
        tmpFileName,
        JSON.stringify(content),
        'application/json'
      );
      if (success) {
        await filesystemService!.renameFile(tmpFileName, fileName);
      }
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

export async function clearNativeDbBackups(profile: string) {
  if (!plt.hasNativeSupport()) return;
  console.log('deleting native backup files for', profile);
  await loadFsService();
  const spaceName = `kiwimeri-space-${profile}-backup.json`;
  const spaceArchiveName = `kiwimeri-space-archive-${profile}-backup.json`;
  const spaceDocContentName = `kiwimeri-space-document-content-${profile}-backup.json`;
  await Promise.all([
    filesystemService!.deleteFile(spaceName),
    filesystemService!.deleteFile(spaceArchiveName),
    filesystemService!.deleteFile(spaceDocContentName)
  ]);
  console.log('deleting native backup files for', profile, 'done');
}
