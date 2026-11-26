import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { createContext, use } from 'react';
import { FOLDER_ROUTE } from '../routes';

type StableRouteContextSpec = {
  route: string; // without search params
  notebook: string;
  folder: string;
  document?: string;
  docVersion?: string;
};

type RouteContextSpec = StableRouteContextSpec & {
  query?: string;
};

export const RouteContext = createContext<RouteContextSpec | undefined>({
  route: FOLDER_ROUTE,
  notebook: DEFAULT_NOTEBOOK_ID,
  folder: DEFAULT_NOTEBOOK_ID
});

function useRouteContext() {
  const routeContext = use(RouteContext);
  if (!routeContext) throw new Error('missing RouteContext provider');
  return routeContext;
}

/** during search query change all the time */
export function useStableRouteContext(): StableRouteContextSpec {
  const { route, notebook, folder, document, docVersion } = useRouteContext();
  return { route, notebook, folder, document, docVersion };
}

export const useCurrentRoute = () => useRouteContext().route;
export const useCurrentFolder = () => useRouteContext().folder;
export const useCurrentDocument = () => useRouteContext().document;
export const useSearchQuery = () => useRouteContext().query;
export const useCurrentVersion = () => useRouteContext().docVersion;

export default RouteContext;
