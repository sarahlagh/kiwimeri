import { ReactNode, useEffect } from 'react';
import { Redirect, useLocation } from 'react-router';
import { getSearchParams } from '../../common/getSearchParams';
import { GET_FOLDER_ROUTE, isCollectionRoute } from '../../common/routes';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import userSettingsService from '../../db/user-settings.service';

type InitialRoutingProviderProps = {
  readonly children?: ReactNode;
};

const InitialRoutingProvider = ({ children }: InitialRoutingProviderProps) => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const folder = searchParams?.folder ? searchParams.folder : ROOT_FOLDER;

  useEffect(() => {
    if (isCollectionRoute(location.pathname)) {
      userSettingsService.setCurrentFolder(folder);
    }
  }, [folder]);

  if (isCollectionRoute(location.pathname)) {
    if (!searchParams?.folder) {
      return <Redirect to={GET_FOLDER_ROUTE(ROOT_FOLDER)} />;
    }
    if (
      searchParams?.folder &&
      !documentsService.documentNodeExists(searchParams.folder)
    ) {
      return <Redirect to={GET_FOLDER_ROUTE(ROOT_FOLDER)} />;
    }
    if (
      searchParams?.document &&
      !documentsService.documentNodeExists(searchParams.document)
    ) {
      return <Redirect to={GET_FOLDER_ROUTE(folder)} />;
    }
    userSettingsService.setCurrentFolder(folder);
  }
  return <>{children}</>;
};

export default InitialRoutingProvider;
