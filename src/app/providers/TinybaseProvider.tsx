import { appConfig } from '@/config';
import {
  space,
  spaceContent,
  spaceMetrics,
  spaceQueries,
  store,
  storeQueries
} from '@/core/db/store';
import { lazy, ReactNode } from 'react';
import { Metrics } from 'tinybase/metrics';
import { Queries } from 'tinybase/queries';
import { Store } from 'tinybase/store';
import { Provider } from 'tinybase/ui-react';

const Inspector = lazy(() =>
  import('tinybase/ui-react-inspector').then(m => ({
    default: m.Inspector
  }))
);

const TinybaseProvider = ({ children }: { readonly children: ReactNode }) => {
  const untypedSpace = space as unknown as Store;
  const untypedSpaceQueries = spaceQueries as unknown as Queries;
  const untypedSpaceMetrics = spaceMetrics as unknown as Metrics;
  const untypedSpaceContent = spaceContent as unknown as Store;
  const untypedStore = store as unknown as Store;
  const untypedStoreQueries = storeQueries as unknown as Queries;

  return (
    <Provider
      store={untypedSpace}
      queries={untypedSpaceQueries}
      metrics={untypedSpaceMetrics}
      storesById={{
        store: untypedStore,
        space: untypedSpace,
        spaceContent: untypedSpaceContent
      }}
      queriesById={{ store: untypedStoreQueries, space: untypedSpaceQueries }}
      metricsById={{ space: untypedSpaceMetrics }}
    >
      {appConfig.DEV_ENABLE_INSPECTOR && <Inspector />}
      {children}
    </Provider>
  );
};

export default TinybaseProvider;
