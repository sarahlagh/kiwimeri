import { META_JSON } from '@/constants';
import { ZipFileTree } from '@/features/import-export/model/model-export';
import importService from '@/features/import-export/services/import.service';
import { strFromU8, strToU8, Unzipped, zipSync } from 'fflate';
import { existsSync } from 'fs';
import { readdir, readFile, rename, writeFile } from 'fs/promises';

/* not a real test - just in case i need to upgrade zip contents after metadata change */

function _renameField(meta: any, oldField: string, newField: string) {
  if (meta[oldField]) {
    meta[newField] = meta[oldField];
    delete meta[oldField];
  }
}

function _migrate(meta: any) {
  console.debug('original meta', { ...meta });
  _renameField(meta, 'created', 'createdAt');
  _renameField(meta, 'updated', 'updatedAt');
  const settings = meta.settings;
  if (settings?.sort) {
    if (settings.sort.by === 'created') {
      settings.sort.by = 'createdAt';
    } else if (settings.sort.by === 'updated') {
      settings.sort.by = 'updatedAt';
    }
    meta.settings = settings;
  }
  if (meta.files) {
    Object.keys(meta.files).forEach(key => {
      meta.files[key] = _migrate(meta.files[key]);
    });
  }
  console.debug('new meta', { ...meta });
  return meta;
}

// common

function parseZipData(unzipped: Unzipped, fileTree: ZipFileTree) {
  Object.keys(unzipped).forEach(itemKey => {
    fileTree[itemKey] = unzipped[itemKey];
    const isDirectory = itemKey.endsWith('/');
    let path = itemKey;
    if (isDirectory) {
      path = path.substring(0, itemKey.length - 1); // remove trailing /
    }
    const names = path.split('/');
    const currentName = names.pop()!;
    if (currentName !== META_JSON) return; //  only care about meta.json
    const stringStr = strFromU8(unzipped[itemKey]);
    try {
      const origMeta = JSON.parse(stringStr);
      const newMeta = _migrate(origMeta);
      fileTree[itemKey] = new Uint8Array(
        strToU8(JSON.stringify(newMeta, null, 2))
      );
    } catch (e) {
      /* ignore */
    }
  });
  return fileTree;
}

const upgradeZip = async (parentDir: string, zipName: string) => {
  const zip = await readFile(`${__dirname}/../_data/${parentDir}/${zipName}`);
  const zipBuffer: ArrayBuffer = new Uint8Array(zip).buffer;
  const unzipped = await importService.readZip(zipBuffer);
  const fileTree = parseZipData(unzipped, {});
  const zipContent = zipSync(fileTree);
  await writeFile(
    `${__dirname}/../_data/${parentDir}/${zipName.replace('.zip', '')}_migrated.zip`,
    zipContent
  );
};

const topLevelDirs = ['zips_with_meta', 'zips_without_meta', 'malformed'];

describe.skip('update zip metadata', async () => {
  for (const parentDir of topLevelDirs) {
    const zips = await readdir(`${__dirname}/../_data/${parentDir}`);
    zips
      .filter(z => z.endsWith('.zip'))
      .forEach(zipName => {
        test(`migrate ${parentDir}/${zipName}`, async () => {
          console.debug('migrating', parentDir, zipName);
          await upgradeZip(parentDir, zipName);
        });

        test.skip(`commit ${parentDir}/${zipName}`, async () => {
          const migratedName = `${__dirname}/../_data/${parentDir}/${zipName.replace('.zip', '')}_migrated.zip`;
          const realName = `${__dirname}/../_data/${parentDir}/${zipName}`;
          if (existsSync(migratedName)) {
            await rename(migratedName, realName);
          }
        });
      });
  }
});
