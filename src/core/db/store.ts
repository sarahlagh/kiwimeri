import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import {
  createMetrics,
  createQueries,
  createStore
} from 'tinybase/with-schemas';
import { migrate } from './migrations/migrate';
import {
  spaceTablesSchema,
  spaceValuesSchema,
  storeTablesSchema,
  storeValuesSchema
} from './store-schema';

console.log('[db] create stores');
const rawStore = createStore();
const storePersister = createIndexedDbPersister(rawStore, 'kiwimeri-store');

const spaceName = `kiwimeri-space-default`;
const rawSpace = createStore();
const spacePersister = createIndexedDbPersister(rawSpace, spaceName);

await Promise.all([storePersister.load(), spacePersister.load()]);
console.log('[db] start to migrate stores');
await migrate(rawSpace, rawStore);
console.log('[db] stores migrated');

export const store = rawStore.setSchema(storeTablesSchema, storeValuesSchema);
export const storeQueries = createQueries(store);
export const storeMetrics = createMetrics(store);

export const space = rawSpace.setSchema(spaceTablesSchema, spaceValuesSchema);
export const spaceQueries = createQueries(space);
export const spaceMetrics = createMetrics(space);

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

export async function destroyStore() {
  return Promise.all([storePersister.destroy(), spacePersister.destroy()]);
}
