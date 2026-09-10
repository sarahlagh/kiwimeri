import { Content, Store as UntypedStore } from 'tinybase';
import { createCustomPersister } from 'tinybase/persisters';
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db';

const contentMap = new Map<string, Content>();
vi.stubGlobal('contentMap', contentMap);

vi.mock(import('@/core/infra/platform'), async importOriginal => {
  const originalModule = await importOriginal();
  vi.spyOn(originalModule.plt, 'hasNativeSupport').mockReturnValue(true);
  return {
    plt: originalModule.plt
  };
});

vi.doMock(
  import('@/core/db/native/native-db-persister'),
  async importOriginal => {
    const originalModule = await importOriginal();
    return {
      loadFsService: async () => {},
      clearNativeDbBackups: async () => {
        contentMap.clear();
      },
      createNativeDbPersister: (_store, name, excludeTables) => ({
        main: createIndexedDbPersister(_store as unknown as UntypedStore, name),
        native: createCustomPersister(
          _store as unknown as UntypedStore,
          async () => {
            return contentMap.get(name);
          },
          async getContent => {
            const content = originalModule.removeExcludedTables(
              getContent(),
              excludeTables || []
            );
            contentMap.set(name, content);
          },
          () => 0,
          () => {}
        )
      })
    };
  }
);
