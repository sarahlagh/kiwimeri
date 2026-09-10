import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { setCurrentProfile } from '@/core/db/store';
import { readFile } from 'fs/promises';
import { Content } from 'tinybase';

declare global {
  interface Window {
    nativeContentMap: Map<string, Content>;
    mainContentMap: Map<string, Content>;
  }
}

const nukeStorage = import('@@/_setup/test.utils').then(m => m.nukeStorage);
const getTriggerNativeSaveMethod = () =>
  import('@/core/db/native/trigger-native-save').then(m => m.triggerNativeSave);

function getStoreModule() {
  return import('@/core/db/store');
}

const getFileContent = async (filename: string) => {
  try {
    const content = await readFile(
      `${__dirname}/../unit/core/db/migrations/_data/${filename}`,
      'utf8'
    );
    return JSON.parse(content);
  } catch (e: any) {
    assert.fail('failed to read test data:' + e.message);
  }
};

describe('reloading from native backups tests', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });
  afterEach(async () => {
    (await nukeStorage)();
    window.nativeContentMap.clear();
    window.mainContentMap.clear();
    vi.useRealTimers();
  });

  test('if space is empty and backup is not found, continue', async () => {
    const space = (await getStoreModule()).space;
    expect(space.getTableIds()).toHaveLength(0);
    expect(window.nativeContentMap.size).toBe(4);
    expect(window.nativeContentMap.keys().every(v => v.endsWith('_read'))).toBe(
      true
    );
  });

  test('if space is empty and backup has invalid schema, continue', async () => {
    window.nativeContentMap.set('kiwimeri-space-default', [
      { wrongTable: {} },
      { invalid: true }
    ]);

    const space = (await getStoreModule()).space;
    expect(window.nativeContentMap.size).toBe(5); // 4 read + 1 set
    expect(space.getTableIds()).toHaveLength(0);
  });

  test('if space is empty and backup is corrupt, continue', async () => {
    window.nativeContentMap.set('kiwimeri-space-default', {} as any);

    const space = (await getStoreModule()).space;
    expect(window.nativeContentMap.size).toBe(5); // 4 read + 1 set
    expect(space.getTableIds()).toHaveLength(0);
  });

  test('if space is empty and backup is found, load and continue', async () => {
    const content = await getFileContent('0.5.0.space-content.json');
    window.nativeContentMap.set('kiwimeri-space-default', content);

    const space = (await getStoreModule()).space;
    expect(window.nativeContentMap.size).toBe(5);
    expect(space.getTableIds().length).toBeGreaterThan(0);
  });

  test('if space is not empty, do not reload', async () => {
    (await getStoreModule()).space.setRow('collection', DEFAULT_NOTEBOOK_ID, {
      createdAt: Date.now()
    });
    window.nativeContentMap.clear();
    vi.resetModules();

    await getStoreModule();
    expect(window.nativeContentMap.size).toBe(0);
  });
});

describe('reloading into different profiles', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    setCurrentProfile('default');
  });
  afterEach(async () => {
    (await nukeStorage)();
    window.nativeContentMap.clear();
    window.mainContentMap.clear();
    vi.useRealTimers();
  });

  test('change profile by reloading store.ts', async () => {
    (await getStoreModule()).space.setValue('appVersion', 'default');
    (await getStoreModule()).store.setRow('profiles', 'test', {
      createdAt: Date.now()
    });
    vi.resetModules();
    setCurrentProfile('test');

    const module = await getStoreModule();

    const space = module.space;
    const store = module.store;
    expect(space.getValue('appVersion')).not.toBe('default');
    expect(store.getRowIds('profiles')).toEqual(['test']);
  });

  test('backups are created by profile', async () => {
    (await getStoreModule()).space.setValue('appVersion', 'default');
    (await getStoreModule()).store.setRow('profiles', 'test', {
      createdAt: Date.now()
    });
    await (
      await getTriggerNativeSaveMethod()
    )();
    expect(window.nativeContentMap.size).toBe(8); // 4 read + 4 set
    vi.resetModules();
    setCurrentProfile('test');

    const module = await getStoreModule();
    await (
      await getTriggerNativeSaveMethod()
    )();

    const space = module.space;
    const store = module.store;
    expect(space.getValue('appVersion')).not.toBe('default');
    expect(store.getRowIds('profiles')).toEqual(['test']);
    expect(window.nativeContentMap.size).toBe(14); // 2 for store + 3x2 for default + 3x2 for test
  });

  test('if space is empty but store is not, load empty space backups but not store backup (new profile scenario)', async () => {
    (await getStoreModule()).store.setRow('profiles', 'test', {
      createdAt: Date.now()
    });
    window.nativeContentMap.clear();
    vi.resetModules();

    const module = await getStoreModule();

    const space = module.space;
    const store = module.store;
    expect(window.nativeContentMap.size).toBe(3);
    expect(window.nativeContentMap.keys().every(v => v.endsWith('_read'))).toBe(
      true
    );
    expect(window.nativeContentMap.has('kiwimeri-store')).toBe(false);
    expect(space.getTableIds()).toHaveLength(0);
    expect(store.getRowIds('profiles')).toEqual(['test']);
  });

  test('if space is empty but store is not, load existing space backup but not store backup (restored profile scenario)', async () => {
    (await getStoreModule()).space.setValue('appVersion', 'default');
    (await getStoreModule()).store.setRow('profiles', 'test', {
      createdAt: Date.now()
    });
    window.nativeContentMap.clear();
    vi.resetModules();
    setCurrentProfile('test');

    const content = await getFileContent('0.5.0.space-content.json');
    window.nativeContentMap.set('kiwimeri-space-test', content);

    const module = await getStoreModule();

    const space = module.space;
    const store = module.store;
    expect(window.nativeContentMap.size).toBe(4); // 3 read + 1 set
    expect(window.nativeContentMap.has('kiwimeri-store')).toBe(false);
    expect(space.getTableIds().length).toBeGreaterThan(0);
    expect(store.getRowIds('profiles')).toEqual(['test']);
    expect(space.getValue('appVersion')).not.toBe('default');
  });
});
