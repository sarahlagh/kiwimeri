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
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { storageService } from '@/domain/space-merging/storage.service';
import { readFile, writeFile } from 'fs/promises';
import { createStore } from 'tinybase/with-schemas';

const spaceMigrationFilename = (v: string) => `${v}.space-content.json`;
const storeMigrationFilename = (v: string) => `${v}.store-content.json`;
const spaceArchiveMigrationFilename = (v: string) =>
  `${v}.space-archive-content.json`;
const spaceDocContentMigrationFilename = (v: string) =>
  `${v}.space-doc-content-content.json`;

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
    const fromVersion = '0.4.2';
    const toVersion = '0.5.0';
    const preMigrationSpaceContent = await getFileContent(
      spaceMigrationFilename(fromVersion)
    );
    const preMigrationStoreContent = await getFileContent(
      storeMigrationFilename(fromVersion)
    );
    const { spaceContent, spaceArchiveContent, storeContent, spaceDocContent } =
      await migrateRawStore(
        preMigrationSpaceContent,
        preMigrationStoreContent,
        null,
        null,
        fromVersion
      );
    await generateExpectedFile(spaceMigrationFilename(toVersion), spaceContent);
    await generateExpectedFile(
      spaceArchiveMigrationFilename(toVersion),
      spaceArchiveContent
    );
    await generateExpectedFile(storeMigrationFilename(toVersion), storeContent);
    await generateExpectedFile(
      spaceDocContentMigrationFilename(toVersion),
      spaceDocContent
    );
  });

  test('0.4.0 to 0.5.0 migration should be successful', async () => {
    const fromVersion = '0.4.0';
    const toVersion = '0.5.0';
    const preMigrationSpaceContent = await getFileContent(
      spaceMigrationFilename(fromVersion)
    );
    const preMigrationStoreContent = await getFileContent(
      storeMigrationFilename(fromVersion)
    );
    const { spaceContent, storeContent, spaceDocContent, spaceArchiveContent } =
      await migrateRawStore(
        preMigrationSpaceContent,
        preMigrationStoreContent,
        null,
        null,
        fromVersion
      );
    const expectedSpaceContent = await getFileContent(
      spaceMigrationFilename(toVersion)
    );
    expect(spaceContent).toEqual(expectedSpaceContent);

    const expectedStoreContent = await getFileContent(
      storeMigrationFilename(toVersion)
    );
    expect(storeContent).toEqual(expectedStoreContent);

    const expectedSpaceArchiveContent = await getFileContent(
      spaceArchiveMigrationFilename(toVersion)
    );
    expect(spaceArchiveContent).toEqual(expectedSpaceArchiveContent);

    const expectedSpaceDocContentContent = await getFileContent(
      spaceDocContentMigrationFilename(toVersion)
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
      fromVersion
    );
    expect(spaceContent2).toEqual(expectedSpaceContent);
    expect(storeContent2).toEqual(expectedStoreContent);
    expect(spaceDocContent2).toEqual(expectedSpaceDocContentContent);
    expect(spaceArchiveContent2).toEqual(expectedSpaceArchiveContent);
  });

  test('0.4.3 to 0.5.0 migration should be successful', async () => {
    const fromVersion = '0.4.3';
    const toVersion = '0.5.0';
    const preMigrationSpaceContent = await getFileContent(
      spaceMigrationFilename(fromVersion)
    );
    const preMigrationStoreContent = await getFileContent(
      storeMigrationFilename(fromVersion)
    );
    const preMigrationSpaceArchiveContent = await getFileContent(
      spaceArchiveMigrationFilename(fromVersion)
    );
    const { spaceContent, storeContent, spaceDocContent, spaceArchiveContent } =
      await migrateRawStore(
        preMigrationSpaceContent,
        preMigrationStoreContent,
        preMigrationSpaceArchiveContent,
        null,
        fromVersion
      );
    const expectedSpaceContent = await getFileContent(
      spaceMigrationFilename(toVersion)
    );
    expect(spaceContent).toEqual(expectedSpaceContent);

    const expectedStoreContent = await getFileContent(
      storeMigrationFilename(toVersion)
    );
    expect(storeContent).toEqual(expectedStoreContent);

    const expectedSpaceArchiveContent = await getFileContent(
      spaceArchiveMigrationFilename(toVersion)
    );
    expect(spaceArchiveContent).toEqual(expectedSpaceArchiveContent);

    const expectedSpaceDocContentContent = await getFileContent(
      spaceDocContentMigrationFilename(toVersion)
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
      fromVersion
    );
    expect(spaceContent2).toEqual(expectedSpaceContent);
    expect(storeContent2).toEqual(expectedStoreContent);
    expect(spaceDocContent2).toEqual(expectedSpaceDocContentContent);
    expect(spaceArchiveContent2).toEqual(expectedSpaceArchiveContent);
  });
});

describe('restore json versioning', () => {
  test('migration from 0.4.0 json is not allowed', async () => {
    const fromVersion = '0.4.0';
    const json = await getFileContent(spaceMigrationFilename(fromVersion));
    expect(() => storageService.restoreJson(JSON.stringify(json))).toThrow(
      'Version mismatch on schemaVersion: expected at least 1, got 0'
    );
  });

  test('migration from 0.4.0 json is not allowed', async () => {
    const fromVersion = '0.4.0';
    const json = await getFileContent(spaceMigrationFilename(fromVersion));
    expect(() => storageService.restoreJson(JSON.stringify(json))).toThrow(
      'Version mismatch on schemaVersion: expected at least 1, got 0'
    );
  });

  test('migration from 0.4.3 json is upgraded', async () => {
    const fromVersion = '0.4.3';
    const json = await getFileContent(spaceMigrationFilename(fromVersion));
    storageService.restoreJson(JSON.stringify(json));

    expect(annotsService.getPreview('u0R3jqIujM3O_8IT')).toBe(
      'https://www.lipsum.com/'
    );
  });
});
