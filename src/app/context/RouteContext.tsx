import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { createContext, use } from 'react';
import { useSearchParams } from 'react-router';
import { FOLDER_ROUTE } from '../routes';

type RouteContextSpec = {
  route: string; // without search params
  notebook: string;
  folder: string;
  document?: string;
  docVersion?: string;
};

export const RouteContext = createContext<RouteContextSpec | undefined>({
  route: FOLDER_ROUTE,
  notebook: DEFAULT_NOTEBOOK_ID,
  folder: DEFAULT_NOTEBOOK_ID
});

export function useRouteContext(): RouteContextSpec {
  const routeContext = use(RouteContext);
  if (!routeContext) throw new Error('missing RouteContext provider');
  return routeContext;
}

export const useCurrentRoute = () => useRouteContext().route;
export const useCurrentFolder = () => useRouteContext().folder;
export const useCurrentDocument = () => useRouteContext().document;
export const useCurrentVersion = () => useRouteContext().docVersion;

export const useSearchQuery = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('query');
  return query ? decodeURI(query) : undefined;
};

export default RouteContext;
