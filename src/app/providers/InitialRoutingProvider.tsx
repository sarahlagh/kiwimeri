import {
  GET_DOCUMENT_ROUTE,
  GET_FOLDER_ROUTE,
  isCollectionRoute
} from '@/common/routes';
import { getSearchParams } from '@/common/utils';
import collectionService from '@/db/collection.service';
import navService from '@/db/nav.service';
import notebooksService from '@/db/notebooks.service';
import { ReactNode, useEffect } from 'react';
import { Redirect, useLocation } from 'react-router';

type InitialRoutingProviderProps = {
  readonly children?: ReactNode;
};

const InitialRoutingProvider = ({ children }: InitialRoutingProviderProps) => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const notebook = notebooksService.useCurrentNotebook();
  const folder = searchParams.folder ? searchParams.folder : notebook;

  useEffect(() => {
    if (isCollectionRoute(location.pathname)) {
      navService.setCurrentFolder(folder);
      navService.setCurrentDocument(searchParams.document);
      navService.setCurrentPage(searchParams.page);
    }
  }, [folder, searchParams.document, searchParams.page]);

  if (isCollectionRoute(location.pathname)) {
    // if no folder
    if (!searchParams.folder) {
      return <Redirect to={GET_FOLDER_ROUTE(notebook)} />;
    }
    // if folder but doesn't exist
    if (
      searchParams.folder &&
      !collectionService.itemExists(searchParams.folder)
    ) {
      return <Redirect to={GET_FOLDER_ROUTE(notebook)} />;
    }
    // if page but no document
    if (!searchParams.document && searchParams.page) {
      return <Redirect to={GET_FOLDER_ROUTE(folder)} />;
    }
    // if document but doesn't exist
    if (
      searchParams.document &&
      !collectionService.itemExists(searchParams.document)
    ) {
      return <Redirect to={GET_FOLDER_ROUTE(folder)} />;
    }
    // if page but doesn't exist
    if (
      searchParams.document &&
      searchParams.page &&
      !collectionService.itemExists(searchParams.page)
    ) {
      return (
        <Redirect to={GET_DOCUMENT_ROUTE(folder, searchParams.document)} />
      );
    }
  }
  return <>{children}</>;
};

export default InitialRoutingProvider;
