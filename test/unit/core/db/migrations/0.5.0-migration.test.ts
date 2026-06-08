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

async function generateExpectedFile(content: any) {
  return writeFile(
    `${__dirname}/_data/0.5.0.space-expected-content.json`,
    JSON.stringify(content)
  );
}

const getFileContent = async (filename: string) => {
  try {
    const content = await readFile(`${__dirname}/_data/${filename}`, 'utf8');
    return JSON.parse(content);
  } catch (e: any) {
    assert.fail('failed to read test data:' + e.message);
  }
};

const getSpaceContent = async () => getFileContent(`0.4.0.space-content.json`);
const getExpectedSpaceContent = async () =>
  getFileContent(`0.5.0.space-expected-content.json`);

async function migrateRawStore(spaceContent: any) {
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
    const preMigrationSpaceContent = await getSpaceContent();
    const { spaceContent } = await migrateRawStore(preMigrationSpaceContent);
    await generateExpectedFile(spaceContent);
  });

  test('4.0.1 migration should be successful', async () => {
    const preMigrationSpaceContent = await getSpaceContent();
    const { spaceContent } = await migrateRawStore(preMigrationSpaceContent);
    const expectedSpaceContent = await getExpectedSpaceContent();
    expect(spaceContent).toEqual(expectedSpaceContent);
  });
});
