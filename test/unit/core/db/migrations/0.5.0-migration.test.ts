import { appConfig } from '@/config';
import { migrate } from '@/core/db/migrations/migrate';
import {
  spaceTablesSchema,
  spaceValuesSchema,
  storeTablesSchema,
  storeValuesSchema
} from '@/core/db/store-schema';
import { readFile, writeFile } from 'fs/promises';
import { createStore } from 'tinybase/with-schemas';

const migrationFixedVersion = '0.4.1';
const spaceMigrationFilename = '0.4.0.space-content.json';
const storeMigrationFilename = '0.4.0.store-content.json';
const spaceMigrationExpectedFilename = '0.5.0.space-expected-content.json';
const storeMigrationExpectedFilename = '0.5.0.store-expected-content.json';
const spaceMigrationWithPagesFilename = '0.4.0.space-content-with-pages.json';
const storeMigrationWithPagesFilename = '0.4.0.store-content-with-pages.json';
const spaceMigrationWithPagesExpectedFilename =
  '0.5.0.space-with-pages-expected-content.json';

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
  spaceContent: any,
  storeContent: any | null,
  fixedVersion: string
) {
  appConfig.KIWIMERI_VERSION = fixedVersion;
  const rawSpace = createStore();
  const rawStore = createStore();
  rawSpace.setContent(spaceContent);
  if (storeContent !== null) rawStore.setContent(storeContent);
  await migrate(rawSpace, rawStore);

  const store = rawStore.setSchema(storeTablesSchema, storeValuesSchema);
  const space = rawSpace.setSchema(spaceTablesSchema, spaceValuesSchema);

  return {
    spaceContent: space.getContent(),
    storeContent: store.getContent()
  };
}

describe('0.5.0 migration', () => {
  test.skip('regenerate 4.0.1 migration expected file', async () => {
    const preMigrationSpaceContent = await getFileContent(
      spaceMigrationFilename
    );
    const preMigrationStoreContent = await getFileContent(
      storeMigrationFilename
    );
    const { spaceContent, storeContent } = await migrateRawStore(
      preMigrationSpaceContent,
      preMigrationStoreContent,
      migrationFixedVersion
    );
    await generateExpectedFile(spaceMigrationExpectedFilename, spaceContent);
    await generateExpectedFile(storeMigrationExpectedFilename, storeContent);
  });

  test('4.0.1 migration should be successful', async () => {
    const preMigrationSpaceContent = await getFileContent(
      spaceMigrationFilename
    );
    const preMigrationStoreContent = await getFileContent(
      storeMigrationFilename
    );
    const { spaceContent, storeContent } = await migrateRawStore(
      preMigrationSpaceContent,
      preMigrationStoreContent,
      migrationFixedVersion
    );
    const expectedSpaceContent = await getFileContent(
      spaceMigrationExpectedFilename
    );
    expect(spaceContent).toEqual(expectedSpaceContent);

    const expectedStoreContent = await getFileContent(
      storeMigrationExpectedFilename
    );
    expect(spaceContent).toEqual(expectedSpaceContent);
    expect(storeContent).toEqual(expectedStoreContent);

    // should run a second time
    const { spaceContent: spaceContent2, storeContent: storeContent2 } =
      await migrateRawStore(spaceContent, storeContent, migrationFixedVersion);
    expect(spaceContent2).toEqual(expectedSpaceContent);
    expect(storeContent2).toEqual(expectedStoreContent);
  });

  test.skip('regenerate 4.0.1 migration-with-pages expected file', async () => {
    const preMigrationSpaceContent = await getFileContent(
      spaceMigrationWithPagesFilename
    );
    const preMigrationStoreContent = await getFileContent(
      storeMigrationWithPagesFilename
    );
    const { spaceContent } = await migrateRawStore(
      preMigrationSpaceContent,
      preMigrationStoreContent,
      migrationFixedVersion
    );
    await generateExpectedFile(
      spaceMigrationWithPagesExpectedFilename,
      spaceContent
    );
  });

  test('4.0.1 migration-with-pages should be successful', async () => {
    const preMigrationSpaceContent = await getFileContent(
      spaceMigrationWithPagesFilename
    );
    const preMigrationStoreContent = await getFileContent(
      storeMigrationWithPagesFilename
    );
    const { spaceContent } = await migrateRawStore(
      preMigrationSpaceContent,
      preMigrationStoreContent,
      migrationFixedVersion
    );
    const expectedSpaceContent = await getFileContent(
      spaceMigrationWithPagesExpectedFilename
    );
    expect(spaceContent).toEqual(expectedSpaceContent);

    // should run a second time
    const { spaceContent: spaceContent2 } = await migrateRawStore(
      spaceContent,
      null,
      migrationFixedVersion
    );
    expect(spaceContent2).toEqual(expectedSpaceContent);
  });
});
