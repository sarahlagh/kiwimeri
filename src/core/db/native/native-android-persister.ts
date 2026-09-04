import type { FilesystemService } from '@/core/infra/filesystem.service';
import { Content, Store as UntypedStore } from 'tinybase';
import { createCustomPersister } from 'tinybase/persisters';

function removeExcludedTables(content: Content, excludeTables: string[]) {
  excludeTables.forEach(tableId => {
    delete content[0][tableId];
  });
  return content;
}

let filesystemService: FilesystemService | null = null;
async function loadService() {
  if (filesystemService === null) {
    filesystemService = (await import('@/core/infra/filesystem.service'))
      .default;
  }
}

export function createAndroidFSBackupPersister(
  _store: UntypedStore,
  name: string,
  excludeTables: string[]
) {
  const fileName = `${name}-backup.json`;
  return createCustomPersister(
    _store,
    async () => {
      await loadService();
      const content = await filesystemService!.readFile(fileName);
      if (content === null) return undefined;
      return JSON.parse(content);
    },
    async getContent => {
      await loadService();
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
