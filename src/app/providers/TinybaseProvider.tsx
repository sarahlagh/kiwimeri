import { ReactNode, useEffect, useState } from 'react';
import { Queries } from 'tinybase/queries';
import { Store } from 'tinybase/store';
import { Provider } from 'tinybase/ui-react';
import { Inspector } from 'tinybase/ui-react-inspector';
import platformService from '../../common/services/platform.service';
import { appConfig } from '../../config';
import storageService from '../../db/storage.service';
import Loading from '../components/Loading';

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

  const store = storageService.getSpace();
  const queries = storageService.getQueries();

  if (isLoading) {
    return <Loading />;
  }
  return (
    <Provider
      store={store as unknown as Store}
      queries={queries as unknown as Queries}
    >
      {platformService.isDev() && appConfig.ENABLE_SPACE_INSPECTOR && (
        <Inspector />
      )}
      {children}
    </Provider>
  );
};

export default TinybaseProvider;
