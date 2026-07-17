// delete after 0.5.0

import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import { createStore } from 'tinybase/with-schemas';

export async function migrateArchiveDatabase(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(window as any).indexedDB) return; // if indexedDB is not defined, don't bother
  const oldDbName = 'kiwimeri-space-content-default';
  const newDbName = 'kiwimeri-space-archive-default';

  if (!(await databaseExists(oldDbName))) return;

  console.warn('old kiwimeri-space-content-default detected');

  const oldStore = createStore();
  const newStore = createStore();

  const oldPersister = createIndexedDbPersister(oldStore, oldDbName);
  const newPersister = createIndexedDbPersister(newStore, newDbName);

  try {
    await newPersister.load();

    if (
      oldStore.hasTable('derived_content') &&
      !newStore.hasTable('derived_content')
    ) {
      await oldPersister.load();
      newStore.setContent(oldStore.getContent());
      await newPersister.save();
    }
  } finally {
    await oldPersister.destroy();
    await newPersister.destroy();
  }

  await deleteDatabase(oldDbName);
}

async function databaseExists(name: string): Promise<boolean> {
  if (!indexedDB.databases) {
    return true; // Fall back to attempting the TinyBase migration.
  }

  const databases = await indexedDB.databases();
  return databases.some(database => database.name === name);
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error(`Failed to delete ${name}`));

    request.onblocked = () =>
      reject(new Error(`Deletion of ${name} is blocked`));
  });
}
