import { appConfig } from '@/config';
import {
  space,
  spaceMetrics,
  spaceQueries,
  store,
  storeQueries
} from '@/core/db/store';
import { ReactNode } from 'react';
import { Metrics } from 'tinybase/metrics';
import { Queries } from 'tinybase/queries';
import { Store } from 'tinybase/store';
import { Provider } from 'tinybase/ui-react';
import { Inspector } from 'tinybase/ui-react-inspector';

const TinybaseProvider = ({ children }: { readonly children: ReactNode }) => {
  const untypedSpace = space as unknown as Store;
  const untypedSpaceQueries = spaceQueries as unknown as Queries;
  const untypedSpaceMetrics = spaceMetrics as unknown as Metrics;
  const untypedStore = store as unknown as Store;
  const untypedStoreQueries = storeQueries as unknown as Queries;

  return (
    <Provider
      store={untypedSpace}
      queries={untypedSpaceQueries}
      metrics={untypedSpaceMetrics}
      storesById={{ store: untypedStore, space: untypedSpace }}
      queriesById={{ store: untypedStoreQueries, space: untypedSpaceQueries }}
      metricsById={{ space: untypedSpaceMetrics }}
    >
      {appConfig.DEV_ENABLE_INSPECTOR && <Inspector />}
      {children}
    </Provider>
  );
};

export default TinybaseProvider;
