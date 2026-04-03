import {
  GET_DOCUMENT_ROUTE,
  GET_FOLDER_ROUTE,
  INIT_ROUTE,
  isCollectionRoute
} from '@/common/routes';
import { getSearchParams } from '@/common/utils';
import { ROOT_COLLECTION } from '@/constants';
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
  const rememberLastRoute = navService.useRememberLastRoute();

  useEffect(() => {
    if (isCollectionRoute(location.pathname)) {
      navService.setCurrentFolder(folder);
      navService.setCurrentDocument(searchParams.document);
      navService.setCurrentPage(searchParams.page);
    }
  }, [folder, searchParams.document, searchParams.page]);

  if (location.pathname === INIT_ROUTE) {
    if (rememberLastRoute) {
      const document = navService.getCurrentDocument();
      const folder = navService.getCurrentFolder();

      if (document && collectionService.itemExists(document)) {
        return <Redirect to={GET_DOCUMENT_ROUTE(folder, document)} />;
      }
      if (folder && collectionService.itemExists(folder)) {
        return <Redirect to={GET_FOLDER_ROUTE(folder)} />;
      }
    }
    return <Redirect to={GET_FOLDER_ROUTE(notebook)} />;
  }
  if (isCollectionRoute(location.pathname)) {
    // if no folder, or if folder but doesn't exist
    if (
      !searchParams.folder ||
      !collectionService.itemExists(searchParams.folder)
    ) {
      if (collectionService.itemExists(notebook)) {
        return <Redirect to={GET_FOLDER_ROUTE(notebook)} />;
      }
      // current notebook doesn't exist, fallback to first
      const notebookId =
        notebooksService.getNotebooks()[0]?.id || ROOT_COLLECTION;
      return <Redirect to={GET_FOLDER_ROUTE(notebookId)} />;
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
        <Redirect
          to={GET_DOCUMENT_ROUTE(
            folder,
            searchParams.document,
            searchParams.query
          )}
        />
      );
    }
  }
  return <>{children}</>;
};

export default InitialRoutingProvider;
