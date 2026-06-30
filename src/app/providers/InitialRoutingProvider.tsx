import {
  GET_DOCUMENT_ROUTE,
  GET_FOLDER_ROUTE,
  INIT_ROUTE,
  isCollectionRoute
} from '@/common_to_migrate/routes';
import { getSearchParams } from '@/common_to_migrate/utils';
import { ROOT_COLLECTION } from '@/constants';
import collectionService from '@/db_to_migrate/collection.service';
import notebooksService from '@/domain/collection/notebooks.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import useDeviceSetting from '@/domain/device-settings/hooks/useDeviceSetting';
import { useCurrentNotebook } from '@/features/notebooks-ui';
import { ReactNode, useEffect } from 'react';
import { Redirect, useLocation } from 'react-router';

type InitialRoutingProviderProps = {
  readonly children?: ReactNode;
};

const InitialRoutingProvider = ({ children }: InitialRoutingProviderProps) => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const notebook = useCurrentNotebook();
  const folder = searchParams.folder ? searchParams.folder : notebook;
  const rememberLastRoute = useDeviceSetting('rememberLastRoute');

  useEffect(() => {
    if (isCollectionRoute(location.pathname)) {
      resumeService.setLastFolder(folder);
      resumeService.setLastDocument(searchParams.document);
    }
  }, [folder, searchParams.document]);

  if (location.pathname === INIT_ROUTE) {
    if (rememberLastRoute) {
      const state = resumeService.getNotebookResumeState(notebook);
      const document = state?.lastDocument;
      const folder = state?.lastFolder || notebook;

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
    // if document but doesn't exist
    if (
      searchParams.document &&
      !collectionService.itemExists(searchParams.document)
    ) {
      return <Redirect to={GET_FOLDER_ROUTE(folder)} />;
    }
  }
  return <>{children}</>;
};

export default InitialRoutingProvider;
