import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import {
  createMetrics,
  createQueries,
  createStore
} from 'tinybase/with-schemas';
import { migrateArchiveDatabase } from './migrate-content-store';
import { migrate } from './migrations/migrate';
import {
  spaceArchiveTablesSchema,
  spaceTablesSchema,
  spaceValuesSchema,
  storeTablesSchema,
  storeValuesSchema
} from './store-schema';

console.log('[db] create stores');
await migrateArchiveDatabase(); // delete after 0.5.0

const rawStore = createStore();
const storePersister = createIndexedDbPersister(rawStore, 'kiwimeri-store');

const spaceName = `kiwimeri-space-default`;
const rawSpace = createStore();
const spacePersister = createIndexedDbPersister(rawSpace, spaceName);

const rawSpaceArchive = createStore();
const spaceArchiveName = `kiwimeri-space-archive-default`;
const spaceArchivePersister = createIndexedDbPersister(
  rawSpaceArchive,
  spaceArchiveName
);

await Promise.all([
  storePersister.load(),
  spacePersister.load(),
  spaceArchivePersister.load()
]);
console.log('[db] start to migrate stores');
await migrate(rawStore, rawSpace, rawSpaceArchive);
console.log('[db] stores migrated');

export const store = rawStore.setSchema(storeTablesSchema, storeValuesSchema);
export const storeQueries = createQueries(store);
export const storeMetrics = createMetrics(store);

export const space = rawSpace.setSchema(spaceTablesSchema, spaceValuesSchema);
export const spaceQueries = createQueries(space);
export const spaceMetrics = createMetrics(space);

export const spaceArchive = rawSpaceArchive.setTablesSchema(
  spaceArchiveTablesSchema
);
export const spaceArchiveQueries = createQueries(spaceArchive);

console.log('[db] stores initialized');

storePersister
  .save()
  .then(() => storePersister.startAutoSave())
  .then(() => {
    console.log('[store] auto save started');
  });

spacePersister
  .save()
  .then(() => spacePersister.startAutoSave())
  .then(() => {
    console.log('[space] auto save started');
  });

// spaceTextPersister.save().then(() => console.log('[spaceText] saved'));
spaceArchivePersister
  .save()
  .then(() => spaceArchivePersister.startAutoSave())
  .then(() => {
    console.log('[spaceArchive] auto save started');
  });

export async function destroyStore() {
  return Promise.all([
    storePersister.destroy(),
    spacePersister.destroy(),
    spaceArchivePersister.destroy()
  ]);
}
