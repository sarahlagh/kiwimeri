import { GET_DOCUMENT_ROUTE, VERSION_ROUTE } from '@/app/routes';
import { historyService } from '@/domain/history/history.service';
import { useCurrentNotebook } from '@/features/collection-notebooks-ui';
import { getSearchParams } from '@/shared/utils';
import { lazy, Suspense, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
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
  const location = useLocation();
  const notebook = useCurrentNotebook();
  const searchParams = getSearchParams(location.search);
  const docId = searchParams.document;
  const parentFolder = searchParams.folder || notebook;
  const docVersion = searchParams.docVersion;

  const [showDocumentActions, setShowDocumentActions] = useState(false);

  const title = useItemTitle(docId || '');
  const folderTitle = useItemTitle(parentFolder || '');

  if (location.pathname !== VERSION_ROUTE && docId) {
    // TODO shouldn't be needed - check why
    return (
      <Navigate
        to={GET_DOCUMENT_ROUTE(parentFolder, docId)}
        // state={{ from: location }}
        // replace
      />
    );
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
            parent={parentFolder}
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
          folder={parentFolder}
          query={searchParams.query}
        ></DocumentVersionViewer>
      </Suspense>
    </TemplateCompactableSplitPage>
  );
};
export default VersionedItemPage;
