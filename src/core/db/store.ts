import {
  createMetrics,
  createQueries,
  createStore
} from 'tinybase/with-schemas';
import { migrateArchiveDatabase } from './migrate-content-store';
import { migrate } from './migrations/migrate';
import {
  createNativeDbPersister,
  loadFsService
} from './native/native-db-persister';
import { NATIVE_STORE_EXCLUDE } from './store-constants';
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
const spaceName = `kiwimeri-space-${profile}`;
const spaceArchiveName = `kiwimeri-space-archive-${profile}`;
const spaceDocContentName = `kiwimeri-space-document-content-${profile}`;

console.log(`[db] create stores for profile [${profile}]`);
await migrateArchiveDatabase(); // delete after 0.5.0

const rawStore = createStore();
const { main: storePersister, native: nativeStorePersister } =
  createNativeDbPersister(rawStore, 'kiwimeri-store', NATIVE_STORE_EXCLUDE);

const rawSpace = createStore();
const { main: spacePersister, native: nativeSpacePersister } =
  createNativeDbPersister(rawSpace, spaceName);

const rawSpaceArchive = createStore();
const { main: spaceArchivePersister, native: nativeSpaceArchivePersister } =
  createNativeDbPersister(rawSpaceArchive, spaceArchiveName);

const rawSpaceDocContent = createStore();
const {
  main: spaceDocContentPersister,
  native: nativeSpaceDocContentPersister
} = createNativeDbPersister(rawSpaceDocContent, spaceDocContentName);

// LOAD

await Promise.all([
  storePersister.load(),
  spacePersister.load(),
  spaceDocContentPersister.load(),
  spaceArchivePersister.load()
]);

// if stores are empty, try loading the native one
if (rawSpace.getTableIds().length === 0 && nativeSpacePersister) {
  console.log('[db] empty stores detected, checking native source');
  await loadFsService();
  await Promise.all([
    nativeStorePersister?.load(),
    nativeSpacePersister.load(),
    nativeSpaceDocContentPersister?.load(),
    nativeSpaceArchivePersister?.load()
  ]).then(() => {
    console.log('[db] done');
  });
}

// MIGRATE

console.log('[db] start to migrate stores');
await migrate(rawStore, rawSpace, rawSpaceDocContent, rawSpaceArchive);
console.log('[db] stores migrated');

// APPLY SCHEMA

export const store = rawStore.setSchema(storeTablesSchema, storeValuesSchema);
export const storeQueries = createQueries(store);
export const storeMetrics = createMetrics(store);

export const space = rawSpace.setSchema(spaceTablesSchema, spaceValuesSchema);
export const spaceQueries = createQueries(space);
export const spaceMetrics = createMetrics(space);

export const spaceDocContent = rawSpaceDocContent.setTablesSchema(
  spaceDocContentTablesSchema
);

export const spaceArchive = rawSpaceArchive.setTablesSchema(
  spaceArchiveTablesSchema
);
export const spaceArchiveQueries = createQueries(spaceArchive);

console.log('[db] stores initialized');

// START

await Promise.all([
  storePersister.startAutoSave(),
  spacePersister.startAutoSave(),
  spaceDocContentPersister.startAutoSave(),
  spaceArchivePersister.startAutoSave()
]).then(() => {
  console.log('[db] auto save started');
});

// start native persisters outside of this file
export function getNativePersisters() {
  return {
    nativeStorePersister,
    nativeSpacePersister,
    nativeSpaceDocContentPersister,
    nativeSpaceArchivePersister
  };
}
