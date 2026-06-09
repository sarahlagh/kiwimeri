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
const migrationFilename = '0.4.0.space-content.json';
const migrationExpectedFilename = '0.5.0.space-expected-content.json';
const migrationWithPagesFilename = '0.4.0.space-content-with-pages.json';
const migrationWithPagesExpectedFilename =
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

async function migrateRawStore(spaceContent: any, fixedVersion: string) {
  appConfig.KIWIMERI_VERSION = '0.4.1';
  const rawSpace = createStore();
  const rawStore = createStore();
  rawSpace.setContent(spaceContent);
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
    const preMigrationSpaceContent = await getFileContent(migrationFilename);
    const { spaceContent } = await migrateRawStore(
      preMigrationSpaceContent,
      migrationFixedVersion
    );
    await generateExpectedFile(migrationExpectedFilename, spaceContent);
  });

  test('4.0.1 migration should be successful', async () => {
    const preMigrationSpaceContent = await getFileContent(migrationFilename);
    const { spaceContent } = await migrateRawStore(
      preMigrationSpaceContent,
      migrationFixedVersion
    );
    const expectedSpaceContent = await getFileContent(
      migrationExpectedFilename
    );
    expect(spaceContent).toEqual(expectedSpaceContent);

    // should run a second time
    const { spaceContent: spaceContent2 } = await migrateRawStore(
      spaceContent,
      migrationFixedVersion
    );
    expect(spaceContent2).toEqual(expectedSpaceContent);
  });

  test.skip('regenerate 4.0.1 migration-with-pages expected file', async () => {
    const preMigrationSpaceContent = await getFileContent(
      migrationWithPagesFilename
    );
    const { spaceContent } = await migrateRawStore(
      preMigrationSpaceContent,
      migrationFixedVersion
    );
    await generateExpectedFile(
      migrationWithPagesExpectedFilename,
      spaceContent
    );
  });

  test('4.0.1 migration-with-pages should be successful', async () => {
    const preMigrationSpaceContent = await getFileContent(
      migrationWithPagesFilename
    );
    const { spaceContent } = await migrateRawStore(
      preMigrationSpaceContent,
      migrationFixedVersion
    );
    const expectedSpaceContent = await getFileContent(
      migrationWithPagesExpectedFilename
    );
    expect(spaceContent).toEqual(expectedSpaceContent);

    // should run a second time
    const { spaceContent: spaceContent2 } = await migrateRawStore(
      spaceContent,
      migrationFixedVersion
    );
    expect(spaceContent2).toEqual(expectedSpaceContent);
  });
});
