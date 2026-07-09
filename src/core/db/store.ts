import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import {
  createMetrics,
  createQueries,
  createStore
} from 'tinybase/with-schemas';
import { migrate } from './migrations/migrate';
import {
  spaceContentTablesSchema,
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

const spaceContentName = `kiwimeri-space-content-default`;
const rawSpaceContent = createStore();
const spaceContentPersister = createIndexedDbPersister(
  rawSpaceContent,
  spaceContentName
);

await Promise.all([
  storePersister.load(),
  spacePersister.load(),
  spaceContentPersister.load()
]);
console.log('[db] start to migrate stores');
await migrate(rawStore, rawSpace, rawSpaceContent);
console.log('[db] stores migrated');

export const store = rawStore.setSchema(storeTablesSchema, storeValuesSchema);
export const storeQueries = createQueries(store);
export const storeMetrics = createMetrics(store);

export const space = rawSpace.setSchema(spaceTablesSchema, spaceValuesSchema);
export const spaceQueries = createQueries(space);
export const spaceMetrics = createMetrics(space);

export const spaceContent = rawSpaceContent.setTablesSchema(
  spaceContentTablesSchema
);

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

spaceContentPersister.save().then(() => console.log('[spaceContent] saved'));

export async function destroyStore() {
  return Promise.all([
    storePersister.destroy(),
    spacePersister.destroy(),
    spaceContentPersister.destroy()
  ]);
}
