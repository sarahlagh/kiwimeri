import { ReactNode, useEffect } from 'react';
import { Store } from 'tinybase/store';
import { Provider } from 'tinybase/ui-react';
import { Inspector } from 'tinybase/ui-react-inspector';
import storageService from '../db/storage.service';

const TinybaseProvider = ({ children }: { readonly children: ReactNode }) => {
  useEffect(() => {
    async function load() {
      await storageService.start();
    }
    load();
  }, []);

  const store = storageService.getStore();
  return (
    <Provider store={store as unknown as Store}>
      <Inspector />
      {children}
    </Provider>
  );
};

export default TinybaseProvider;
