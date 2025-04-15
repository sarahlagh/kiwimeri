import storageService from '@/db/storage.service';
import { Provider } from 'tinybase/ui-react';
import { Inspector } from 'tinybase/ui-react-inspector';

const DebugTinybaseProvider = () => {
  return (
    <Provider
      store={storageService.getUntypedStore()}
      queries={storageService.getUntypedStoreQueries()}
    >
      <Inspector />
    </Provider>
  );
};

export default DebugTinybaseProvider;
