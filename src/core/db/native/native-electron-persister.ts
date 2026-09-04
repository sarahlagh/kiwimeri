import { Content, Store as UntypedStore } from 'tinybase';
import { createCustomPersister } from 'tinybase/persisters';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronAPI = (window as any).electronAPI;

function removeExcludedTables(content: Content, excludeTables: string[]) {
  excludeTables.forEach(tableId => {
    delete content[0][tableId];
  });
  return content;
}

export function createElectronFSBackupPersister(
  _store: UntypedStore,
  name: string,
  excludeTables: string[]
) {
  const filename = `${name}-backup.json`;
  return createCustomPersister(
    _store,
    async () => {
      return await electronAPI.readFile(filename);
    },
    async getContent => {
      await electronAPI.writeFile(
        filename,
        removeExcludedTables(getContent(), excludeTables)
      );
    },
    // addPersisterListener: no need for polling the native source
    () => 0,
    // delPersisterListener: nothing to delete
    () => {}
  );
}
