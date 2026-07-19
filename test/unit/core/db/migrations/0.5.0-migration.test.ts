import { appConfig } from '@/config';
import { migrate } from '@/core/db/migrations/migrate';
import {
  spaceArchiveTablesSchema,
  spaceDocContentTablesSchema,
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
const spaceDocContentMigrationExpectedFilename =
  '0.5.0.space-doc-content-expected-content.json';
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
  _spaceDocContent: any | null,
  fixedVersion: string
) {
  appConfig.KIWIMERI_VERSION = fixedVersion;
  const rawStore = createStore();
  const rawSpace = createStore();
  const rawSpaceDocContent = createStore();
  const rawSpaceArchive = createStore();
  rawSpace.setContent(_spaceContent);
  if (_storeContent !== null) rawStore.setContent(_storeContent);
  if (_spaceArchiveContent !== null)
    rawSpaceArchive.setContent(_spaceArchiveContent);
  if (_spaceDocContent !== null)
    rawSpaceDocContent.setContent(_spaceDocContent);
  await migrate(rawStore, rawSpace, rawSpaceDocContent, rawSpaceArchive);

  const store = rawStore.setSchema(storeTablesSchema, storeValuesSchema);
  const space = rawSpace.setSchema(spaceTablesSchema, spaceValuesSchema);
  const spaceDocContent = rawSpaceDocContent.setTablesSchema(
    spaceDocContentTablesSchema
  );
  const spaceArchive = rawSpaceArchive.setTablesSchema(
    spaceArchiveTablesSchema
  );

  return {
    storeContent: store.getContent(),
    spaceContent: space.getContent(),
    spaceDocContent: spaceDocContent.getContent(),
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
    const { spaceContent, spaceArchiveContent, storeContent, spaceDocContent } =
      await migrateRawStore(
        preMigrationSpaceContent,
        preMigrationStoreContent,
        null,
        null,
        migrationFixedVersion
      );
    await generateExpectedFile(spaceMigrationExpectedFilename, spaceContent);
    await generateExpectedFile(
      spaceArchiveMigrationExpectedFilename,
      spaceArchiveContent
    );
    await generateExpectedFile(storeMigrationExpectedFilename, storeContent);
    await generateExpectedFile(
      spaceDocContentMigrationExpectedFilename,
      spaceDocContent
    );
  });

  test('0.4.2 to 0.5.0 migration should be successful', async () => {
    const migrationFixedVersion = '0.4.2';
    const preMigrationSpaceContent = await getFileContent(
      spaceMigrationFilename(migrationFixedVersion)
    );
    const preMigrationStoreContent = await getFileContent(
      storeMigrationFilename(migrationFixedVersion)
    );
    const { spaceContent, storeContent, spaceDocContent, spaceArchiveContent } =
      await migrateRawStore(
        preMigrationSpaceContent,
        preMigrationStoreContent,
        null,
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

    const expectedSpaceDocContentContent = await getFileContent(
      spaceDocContentMigrationExpectedFilename
    );
    expect(spaceDocContent).toEqual(expectedSpaceDocContentContent);

    // should run a second time
    const {
      spaceContent: spaceContent2,
      storeContent: storeContent2,
      spaceArchiveContent: spaceArchiveContent2,
      spaceDocContent: spaceDocContent2
    } = await migrateRawStore(
      spaceContent,
      storeContent,
      spaceArchiveContent,
      spaceDocContent,
      migrationFixedVersion
    );
    expect(spaceContent2).toEqual(expectedSpaceContent);
    expect(storeContent2).toEqual(expectedStoreContent);
    expect(spaceArchiveContent2).toEqual(expectedSpaceArchiveContent);
    expect(spaceDocContent2).toEqual(expectedSpaceDocContentContent);
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
    const { spaceContent, storeContent, spaceDocContent, spaceArchiveContent } =
      await migrateRawStore(
        preMigrationSpaceContent,
        preMigrationStoreContent,
        preMigrationSpaceArchiveContent,
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

    const expectedSpaceDocContentContent = await getFileContent(
      spaceDocContentMigrationExpectedFilename
    );
    expect(spaceDocContent).toEqual(expectedSpaceDocContentContent);

    // should run a second time
    const {
      spaceContent: spaceContent2,
      storeContent: storeContent2,
      spaceDocContent: spaceDocContent2,
      spaceArchiveContent: spaceArchiveContent2
    } = await migrateRawStore(
      spaceContent,
      storeContent,
      spaceArchiveContent,
      spaceDocContent,
      migrationFixedVersion
    );
    expect(spaceContent2).toEqual(expectedSpaceContent);
    expect(storeContent2).toEqual(expectedStoreContent);
    expect(spaceDocContent2).toEqual(expectedSpaceDocContentContent);
    expect(spaceArchiveContent2).toEqual(expectedSpaceArchiveContent);
  });
});
