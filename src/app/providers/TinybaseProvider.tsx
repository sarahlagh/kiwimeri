import { ReactNode, useEffect } from 'react';
import { Queries } from 'tinybase/queries';
import { Store } from 'tinybase/store';
import { Provider } from 'tinybase/ui-react';
import { Inspector } from 'tinybase/ui-react-inspector';
import documentsService from '../db/documents.service';
import storageService from '../db/storage.service';

const TinybaseProvider = ({ children }: { readonly children: ReactNode }) => {
  useEffect(() => {
    async function load() {
      await storageService.start();
    }
    load();
  }, []);

  const store = storageService.getStore();
  const queries = documentsService.getQueries();
  return (
    <Provider
      store={store as unknown as Store}
      queries={queries as unknown as Queries}
    >
      <Inspector />
      {children}
    </Provider>
  );
};

export default TinybaseProvider;
