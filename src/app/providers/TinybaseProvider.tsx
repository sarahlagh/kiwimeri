import { ReactNode } from 'react';
import { Store } from 'tinybase/store';
import { Provider } from 'tinybase/ui-react';
import { Inspector } from 'tinybase/ui-react-inspector';
import storageService from '../db/storage.service';

const TinybaseProvider = ({ children }: { readonly children: ReactNode }) => {
  const store = storageService.getStore();
  return (
    <Provider store={store as unknown as Store}>
      <Inspector />
      {children}
    </Provider>
  );
};

export default TinybaseProvider;
