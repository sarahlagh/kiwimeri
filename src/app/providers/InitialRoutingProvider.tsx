import {
  GET_DOCUMENT_ROUTE,
  GET_FOLDER_ROUTE,
  INIT_ROUTE,
  isCollectionRoute
} from '@/app/routes';
import { ROOT_COLLECTION } from '@/constants';
import collectionService from '@/domain/collection/collection.service';
import notebooksService from '@/domain/collection/notebooks.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import useDeviceSetting from '@/shared/hooks/useDeviceSetting';
import { ReactNode, useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router';
import RouteContext from '../context/RouteContext';

type InitialRoutingProviderProps = {
  readonly children?: ReactNode;
};

const InitialRoutingProvider = ({ children }: InitialRoutingProviderProps) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const route = location.pathname;
  const notebook = notebooksService.getCurrentNotebook();
  const folder = searchParams.get('folder') || notebook;
  const document = searchParams.get('document') || undefined;
  const docVersion = searchParams.get('docVersion') || undefined;
  const rememberLastRoute = useDeviceSetting('rememberLastRoute');

  const routeContext = useMemo(
    () => ({
      route,
      notebook,
      folder,
      document,
      docVersion
    }),
    [route, notebook, folder, document, docVersion]
  );

  useEffect(() => {
    if (isCollectionRoute(route)) {
      resumeService.setLastFolder(folder);
      resumeService.setLastDocument(document);
    }
  }, [route, folder, document]);

  if (route === INIT_ROUTE) {
    if (rememberLastRoute) {
      const state = resumeService.getNotebookResumeState(notebook);
      const document = state?.lastDocument;
      const folder = state?.lastFolder || notebook;

      if (document && collectionService.itemExists(document)) {
        return <Navigate to={GET_DOCUMENT_ROUTE(folder, document)} />;
      }
      if (folder && collectionService.itemExists(folder)) {
        return <Navigate to={GET_FOLDER_ROUTE(folder)} />;
      }
    }
    return <Navigate to={GET_FOLDER_ROUTE(notebook)} />;
  }
  if (isCollectionRoute(route)) {
    // if no folder, or if folder but doesn't exist
    if (!folder || !collectionService.itemExists(folder)) {
      if (collectionService.itemExists(notebook)) {
        return <Navigate to={GET_FOLDER_ROUTE(notebook)} />;
      }
      // current notebook doesn't exist, fallback to first
      const notebookId =
        notebooksService.getNotebooks()[0]?.id || ROOT_COLLECTION;
      return <Navigate to={GET_FOLDER_ROUTE(notebookId)} />;
    }
    // if document but doesn't exist
    if (document && !collectionService.itemExists(document)) {
      return <Navigate to={GET_FOLDER_ROUTE(folder)} />;
    }
  }
  return <RouteContext value={routeContext}>{children}</RouteContext>;
};

export default InitialRoutingProvider;
