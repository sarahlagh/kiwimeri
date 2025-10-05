import Loading from '@/app/components/Loading';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { appLog } from '@/log';
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
      console.debug('[storage] starting');
      await storageService.start();
      setIsLoading(false);
      await remotesService.initSync();
      appLog.gc(); // TODO run at interval
    }
    load();

    return () => {
      console.debug('[storage] stopping');
      remotesService.stopSync();
      storageService.stop();
    };
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
