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
  spaceDocContentTablesSchema,
  spaceTablesSchema,
  spaceValuesSchema,
  storeTablesSchema,
  storeValuesSchema
} from './store-schema';

export function getCurrentProfile() {
  return localStorage.getItem('currentSpace') || 'default';
}
export function setCurrentProfile(profile: string) {
  localStorage.setItem('currentSpace', profile);
}

const profile = getCurrentProfile();

console.log(`[db] create stores for profile [${profile}]`);
await migrateArchiveDatabase(); // delete after 0.5.0

const rawStore = createStore();
const storePersister = createIndexedDbPersister(rawStore, 'kiwimeri-store');

const spaceName = `kiwimeri-space-${profile}`;
const rawSpace = createStore();
const spacePersister = createIndexedDbPersister(rawSpace, spaceName);

const rawSpaceArchive = createStore();
const spaceArchiveName = `kiwimeri-space-archive-${profile}`;
const spaceArchivePersister = createIndexedDbPersister(
  rawSpaceArchive,
  spaceArchiveName
);

const rawSpaceDocContentText = createStore();
const spaceDocContentName = `kiwimeri-space-document-content-${profile}`;
const spaceDocContentPersister = createIndexedDbPersister(
  rawSpaceDocContentText,
  spaceDocContentName
);

await Promise.all([
  storePersister.load(),
  spacePersister.load(),
  spaceDocContentPersister.load(),
  spaceArchivePersister.load()
]);
console.log('[db] start to migrate stores');
await migrate(rawStore, rawSpace, rawSpaceDocContentText, rawSpaceArchive);
console.log('[db] stores migrated');

export const store = rawStore.setSchema(storeTablesSchema, storeValuesSchema);
export const storeQueries = createQueries(store);
export const storeMetrics = createMetrics(store);

export const space = rawSpace.setSchema(spaceTablesSchema, spaceValuesSchema);
export const spaceQueries = createQueries(space);
export const spaceMetrics = createMetrics(space);

export const spaceDocContent = rawSpaceDocContentText.setTablesSchema(
  spaceDocContentTablesSchema
);

export const spaceArchive = rawSpaceArchive.setTablesSchema(
  spaceArchiveTablesSchema
);
export const spaceArchiveQueries = createQueries(spaceArchive);

console.log('[db] stores initialized');

await Promise.all([
  storePersister.save(),
  spacePersister.save(),
  spaceDocContentPersister.save(),
  spaceArchivePersister.save()
]);
storePersister.startAutoSave().then(() => {
  console.log('[store] auto save started');
});
spacePersister.startAutoSave().then(() => {
  console.log('[space] auto save started');
});

// TODO don't auto save
spaceDocContentPersister.startAutoSave().then(() => {
  console.log('[spaceDocContent] auto save started');
});

spaceArchivePersister.startAutoSave().then(() => {
  console.log('[spaceArchive] auto save started');
});

export async function destroyStore() {
  return Promise.all([
    storePersister.destroy(),
    spacePersister.destroy(),
    spaceDocContentPersister.destroy(),
    spaceArchivePersister.destroy()
  ]);
}
