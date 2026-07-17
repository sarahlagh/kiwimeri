import { appConfig } from '@/config';
import {
  space,
  spaceArchive,
  spaceArchiveQueries,
  spaceMetrics,
  spaceQueries,
  store,
  storeQueries
} from '@/core/db/store';
import { lazy, ReactNode, Suspense } from 'react';
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
  const untypedSpaceArchive = spaceArchive as unknown as Store;
  const untypedSpaceArchiveQueries = spaceArchiveQueries as unknown as Queries;
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
        spaceArchive: untypedSpaceArchive
      }}
      queriesById={{
        store: untypedStoreQueries,
        space: untypedSpaceQueries,
        spaceArchive: untypedSpaceArchiveQueries
      }}
      metricsById={{ space: untypedSpaceMetrics }}
    >
      {appConfig.DEV_ENABLE_INSPECTOR && (
        <Suspense>
          <Inspector />
        </Suspense>
      )}
      {children}
    </Provider>
  );
};

export default TinybaseProvider;
