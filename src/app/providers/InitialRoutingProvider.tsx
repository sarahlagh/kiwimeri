import { GET_FOLDER_ROUTE, isCollectionRoute } from '@/common/routes';
import { getSearchParams } from '@/common/utils';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import userSettingsService from '@/db/user-settings.service';
import { ReactNode, useEffect } from 'react';
import { Redirect, useLocation } from 'react-router';

type InitialRoutingProviderProps = {
  readonly children?: ReactNode;
};

const InitialRoutingProvider = ({ children }: InitialRoutingProviderProps) => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const folder = searchParams?.folder ? searchParams.folder : ROOT_FOLDER;
  const notebook = notebooksService.useCurrentNotebook();

  useEffect(() => {
    if (isCollectionRoute(location.pathname)) {
      userSettingsService.setCurrentFolder(folder);
      userSettingsService.setCurrentDocument(searchParams?.document);
    }
  }, [folder, searchParams?.document]);

  if (isCollectionRoute(location.pathname)) {
    if (!searchParams?.folder) {
      return <Redirect to={GET_FOLDER_ROUTE(ROOT_FOLDER)} />;
    }
    if (
      searchParams?.folder &&
      !collectionService.itemExists(searchParams.folder, notebook)
    ) {
      return <Redirect to={GET_FOLDER_ROUTE(ROOT_FOLDER)} />;
    }
    if (
      searchParams?.document &&
      !collectionService.itemExists(searchParams.document, notebook)
    ) {
      return <Redirect to={GET_FOLDER_ROUTE(folder)} />;
    }
  }
  return <>{children}</>;
};

export default InitialRoutingProvider;
