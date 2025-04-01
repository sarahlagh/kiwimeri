import { ReactNode } from 'react';
import { Redirect, useLocation } from 'react-router';
import { getSearchParams } from '../../common/getSearchParams';
import {
  DOCUMENT_ROUTE,
  FOLDER_ROUTE,
  GET_FOLDER_ROUTE
} from '../../common/routes';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';

type InitialRoutingProviderProps = {
  readonly children?: ReactNode;
};

const InitialRoutingProvider = ({ children }: InitialRoutingProviderProps) => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);

  if (
    location.pathname === FOLDER_ROUTE ||
    location.pathname === DOCUMENT_ROUTE
  ) {
    if (
      searchParams?.folder &&
      !documentsService.documentNodeExists(searchParams.folder)
    ) {
      return <Redirect to={GET_FOLDER_ROUTE(ROOT_FOLDER)} />;
    }
    const folder = searchParams.folder ? searchParams.folder : ROOT_FOLDER;
    if (
      searchParams?.document &&
      !documentsService.documentNodeExists(searchParams.document)
    ) {
      return <Redirect to={GET_FOLDER_ROUTE(folder)} />;
    }
  }
  return <>{children}</>;
};

export default InitialRoutingProvider;
