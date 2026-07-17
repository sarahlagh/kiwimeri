import { appConfig } from '@/config';
import { migrate } from '@/core/db/migrations/migrate';
import {
  spaceArchiveTablesSchema,
  spaceTablesSchema,
  spaceValuesSchema,
  storeTablesSchema,
  storeValuesSchema
} from '@/core/db/store-schema';
import { readFile, writeFile } from 'fs/promises';
import { createStore } from 'tinybase/with-schemas';

const spaceMigrationFilename = (v: string) => `${v}.space-content.json`;
const storeMigrationFilename = (v: string) => `${v}.store-content.json`;
const spaceArchiveMigrationFilename = (v: string) =>
  `${v}.space-archive-content.json`;

const spaceMigrationExpectedFilename = '0.5.0.space-expected-content.json';
const spaceArchiveMigrationExpectedFilename =
  '0.5.0.space-archive-expected-content.json';
const storeMigrationExpectedFilename = '0.5.0.store-expected-content.json';

async function generateExpectedFile(filename: string, content: any) {
  return writeFile(`${__dirname}/_data/${filename}`, JSON.stringify(content));
}

const getFileContent = async (filename: string) => {
  try {
    const content = await readFile(`${__dirname}/_data/${filename}`, 'utf8');
    return JSON.parse(content);
  } catch (e: any) {
    assert.fail('failed to read test data:' + e.message);
  }
};

async function migrateRawStore(
  _spaceContent: any,
  _storeContent: any | null,
  _spaceArchiveContent: any | null,
  fixedVersion: string
) {
  appConfig.KIWIMERI_VERSION = fixedVersion;
  const rawStore = createStore();
  const rawSpace = createStore();
  const rawSpaceArchive = createStore();
  rawSpace.setContent(_spaceContent);
  if (_storeContent !== null) rawStore.setContent(_storeContent);
  if (_spaceArchiveContent !== null)
    rawSpaceArchive.setContent(_spaceArchiveContent);
  await migrate(rawStore, rawSpace, rawSpaceArchive);

  const store = rawStore.setSchema(storeTablesSchema, storeValuesSchema);
  const space = rawSpace.setSchema(spaceTablesSchema, spaceValuesSchema);
  const spaceArchive = rawSpaceArchive.setTablesSchema(
    spaceArchiveTablesSchema
  );

  return {
    storeContent: store.getContent(),
    spaceContent: space.getContent(),
    spaceArchiveContent: spaceArchive.getContent()
  };
}

describe('0.5.0 migration', () => {
  test.skip('regenerate 0.5.0 migration expected file', async () => {
    const migrationFixedVersion = '0.4.2';
    const preMigrationSpaceContent = await getFileContent(
      spaceMigrationFilename(migrationFixedVersion)
    );
    const preMigrationStoreContent = await getFileContent(
      storeMigrationFilename(migrationFixedVersion)
    );
    const { spaceContent, spaceArchiveContent, storeContent } =
      await migrateRawStore(
        preMigrationSpaceContent,
        preMigrationStoreContent,
        null,
        migrationFixedVersion
      );
    await generateExpectedFile(spaceMigrationExpectedFilename, spaceContent);
    await generateExpectedFile(
      spaceArchiveMigrationExpectedFilename,
      spaceArchiveContent
    );
    await generateExpectedFile(storeMigrationExpectedFilename, storeContent);
  });

  test('0.4.2 to 0.5.0 migration should be successful', async () => {
    const migrationFixedVersion = '0.4.2';
    const preMigrationSpaceContent = await getFileContent(
      spaceMigrationFilename(migrationFixedVersion)
    );
    const preMigrationStoreContent = await getFileContent(
      storeMigrationFilename(migrationFixedVersion)
    );
    const { spaceContent, storeContent, spaceArchiveContent } =
      await migrateRawStore(
        preMigrationSpaceContent,
        preMigrationStoreContent,
        null,
        migrationFixedVersion
      );
    const expectedSpaceContent = await getFileContent(
      spaceMigrationExpectedFilename
    );
    expect(spaceContent).toEqual(expectedSpaceContent);

    const expectedStoreContent = await getFileContent(
      storeMigrationExpectedFilename
    );
    expect(storeContent).toEqual(expectedStoreContent);

    const expectedSpaceArchiveContent = await getFileContent(
      spaceArchiveMigrationExpectedFilename
    );
    expect(spaceArchiveContent).toEqual(expectedSpaceArchiveContent);

    // should run a second time
    const {
      spaceContent: spaceContent2,
      storeContent: storeContent2,
      spaceArchiveContent: spaceArchiveContent2
    } = await migrateRawStore(
      spaceContent,
      storeContent,
      spaceArchiveContent,
      migrationFixedVersion
    );
    expect(spaceContent2).toEqual(expectedSpaceContent);
    expect(storeContent2).toEqual(expectedStoreContent);
    expect(spaceArchiveContent2).toEqual(expectedSpaceArchiveContent);
  });

  test('0.4.3 to 0.5.0 migration should be successful', async () => {
    const migrationFixedVersion = '0.4.3';
    const preMigrationSpaceContent = await getFileContent(
      spaceMigrationFilename(migrationFixedVersion)
    );
    const preMigrationStoreContent = await getFileContent(
      storeMigrationFilename(migrationFixedVersion)
    );
    const preMigrationSpaceArchiveContent = await getFileContent(
      spaceArchiveMigrationFilename(migrationFixedVersion)
    );
    const { spaceContent, storeContent, spaceArchiveContent } =
      await migrateRawStore(
        preMigrationSpaceContent,
        preMigrationStoreContent,
        preMigrationSpaceArchiveContent,
        migrationFixedVersion
      );
    const expectedSpaceContent = await getFileContent(
      spaceMigrationExpectedFilename
    );
    expect(spaceContent).toEqual(expectedSpaceContent);

    const expectedStoreContent = await getFileContent(
      storeMigrationExpectedFilename
    );
    expect(storeContent).toEqual(expectedStoreContent);

    const expectedSpaceArchiveContent = await getFileContent(
      spaceArchiveMigrationExpectedFilename
    );
    expect(spaceArchiveContent).toEqual(expectedSpaceArchiveContent);

    // should run a second time
    const {
      spaceContent: spaceContent2,
      storeContent: storeContent2,
      spaceArchiveContent: spaceArchiveContent2
    } = await migrateRawStore(
      spaceContent,
      storeContent,
      spaceArchiveContent,
      migrationFixedVersion
    );
    expect(spaceContent2).toEqual(expectedSpaceContent);
    expect(storeContent2).toEqual(expectedStoreContent);
    expect(spaceArchiveContent2).toEqual(expectedSpaceArchiveContent);
  });
});
