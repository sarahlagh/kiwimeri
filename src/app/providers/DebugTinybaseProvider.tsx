import { Store } from 'tinybase/store';
import { Provider } from 'tinybase/ui-react';
import { Inspector } from 'tinybase/ui-react-inspector';
import storageService from '../../db/storage.service';

const DebugTinybaseProvider = () => {
  const store = storageService.getStore();

  return (
    <Provider store={store as unknown as Store}>
      <Inspector />
    </Provider>
  );
};

export default DebugTinybaseProvider;
