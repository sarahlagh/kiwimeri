import { GET_DOCUMENT_ROUTE, VERSION_ROUTE } from '@/app/routes';
import { historyService } from '@/domain/history/history.service';
import { lazy, Suspense, useState } from 'react';
import { Navigate } from 'react-router';
import { useRouteContext } from '../context/RouteContext';
import useItemTitle from '../hooks/useItemTitle';
import NotFoundPage from './NotFoundPage';
import TemplateCompactableSplitPage from './TemplateCompactableSplitPage';

const DocumentVersionViewer = lazy(() =>
  import('@/features/collection-history-ui').then(m => ({
    default: m.DocumentVersionViewer
  }))
);

const CollectionItemBrowserList = lazy(() =>
  import('@/features/collection-browser').then(m => ({
    default: m.CollectionItemBrowserList
  }))
);

const VersionedItemPage = () => {
  const routeCtx = useRouteContext();
  const docId = routeCtx.document;
  const parentFolder = routeCtx.folder;
  const docVersion = routeCtx.docVersion;

  const [showDocumentActions, setShowDocumentActions] = useState(false);

  const title = useItemTitle(docId || '');
  const folderTitle = useItemTitle(parentFolder);

  if (routeCtx.route !== VERSION_ROUTE && docId) {
    // TODO shouldn't be needed - check why
    return <Navigate to={GET_DOCUMENT_ROUTE(parentFolder, docId)} />;
  }

  if (!docId || !docVersion || !historyService.versionExists(docVersion)) {
    return <NotFoundPage />;
  }

  return (
    <TemplateCompactableSplitPage
      headerIfCompact={{
        title,
        editable: false,
        showActions: true,
        onActionsClick: () => setShowDocumentActions(!showDocumentActions),
        color: 'tertiary'
      }}
      headerIfWide={{
        title: folderTitle, // to replace with breadcrumb
        editable: false
      }}
      menu={
        <Suspense>
          <CollectionItemBrowserList
            parentId={parentFolder}
            documentId={docId}
          ></CollectionItemBrowserList>
        </Suspense>
      }
      contentId="documentExplorer"
    >
      <Suspense>
        <DocumentVersionViewer
          docId={docId}
          docVersion={docVersion}
          showActions={showDocumentActions}
          setShowActions={setShowDocumentActions}
          folder={parentFolder}
        ></DocumentVersionViewer>
      </Suspense>
    </TemplateCompactableSplitPage>
  );
};
export default VersionedItemPage;
