import { Content, Store as UntypedStore } from 'tinybase';
import { createCustomPersister } from 'tinybase/persisters';
import { IndexedDbPersister } from 'tinybase/persisters/persister-indexed-db';

const nativeContentMap = new Map<string, Content>();
vi.stubGlobal('nativeContentMap', nativeContentMap);

const mainContentMap = new Map<string, Content>();
vi.stubGlobal('mainContentMap', mainContentMap);

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
    const removeExcludedTables = originalModule.removeExcludedTables;
    return {
      loadFsService: async () => {},
      clearNativeDbBackups: async (profile: string) => {
        nativeContentMap.delete(`kiwimeri-space-${profile}`);
        nativeContentMap.delete(`kiwimeri-space-archive-${profile}`);
        nativeContentMap.delete(`kiwimeri-space-document-content-${profile}`);
      },
      createNativeDbPersister: (_store, name, excludeTables) => ({
        main: createCustomPersister(
          _store as unknown as UntypedStore,
          async () => {
            mainContentMap.set(`${name}_read`, [{}, {}]);
            return mainContentMap.get(name);
          },
          async getContent => {
            const content = removeExcludedTables(
              getContent(),
              excludeTables || []
            );
            mainContentMap.set(name, content);
          },
          () => 0,
          () => {}
        ) as unknown as IndexedDbPersister,
        native: createCustomPersister(
          _store as unknown as UntypedStore,
          async () => {
            nativeContentMap.set(`${name}_read`, [{}, {}]);
            return nativeContentMap.get(name);
          },
          async getContent => {
            const content = removeExcludedTables(
              getContent(),
              excludeTables || []
            );
            nativeContentMap.set(name, content);
          },
          () => 0,
          () => {}
        )
      })
    };
  }
);
