import Loading from '@/app/components/Loading';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import storageService from '@/db/storage.service';
import { ReactNode, useEffect, useState } from 'react';
import { Indexes } from 'tinybase/indexes';
import { Queries } from 'tinybase/queries';
import { Store } from 'tinybase/store';
import { Provider } from 'tinybase/ui-react';
import { Inspector } from 'tinybase/ui-react-inspector';

const TinybaseProvider = ({ children }: { readonly children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    async function load() {
      const ok = await storageService.start();
      if (ok) {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const space = storageService.getSpace() as unknown as Store;
  const spaceQueries = storageService.getSpaceQueries() as unknown as Queries;
  const store = storageService.getStore() as unknown as Store;
  const storeQueries = storageService.getStoreQueries() as unknown as Queries;
  const storeIndexes = storageService.getStoreIndexes() as unknown as Indexes;

  if (isLoading) {
    return <Loading />;
  }
  return (
    <Provider
      storesById={{ store, space }}
      queriesById={{ store: storeQueries, space: spaceQueries }}
      indexesById={{ store: storeIndexes }}
    >
      {platformService.isDev() && appConfig.DEV_ENABLE_INSPECTOR && (
        <Inspector />
      )}
      {children}
    </Provider>
  );
};

export default TinybaseProvider;
