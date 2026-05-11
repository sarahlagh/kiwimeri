import CollectionItemBrowserList from '@/collection/components/CollectionItemBrowserList';
import DocumentVersionViewer from '@/collection/components/DocumentVersionViewer';
import { GET_DOCUMENT_ROUTE, VERSION_ROUTE } from '@/common/routes';
import { getSearchParams } from '@/common/utils';
import { APPICONS } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useState } from 'react';
import { Redirect, useLocation } from 'react-router';
import NotFoundPage from './NotFoundPage';
import TemplateCompactableSplitPage from './TemplateCompactableSplitPage';

const VersionedItemPage = () => {
  const location = useLocation();
  const notebook = notebooksService.useCurrentNotebook();
  const searchParams = getSearchParams(location.search);
  const docId = searchParams.document;
  const parentFolder = searchParams.folder || notebook;
  const pageId = searchParams.page;
  const docVersion = searchParams.docVersion;
  const pageVersion = searchParams.pageVersion;

  const [showDocumentActions, setShowDocumentActions] = useState(false);

  const title = collectionService.useItemTitle(docId || '');
  const folderTitle = collectionService.useItemTitle(parentFolder || '');

  const CollectionItemActionsMenu = () => {
    return (
      <IonButton
        onClick={() => {
          setShowDocumentActions(!showDocumentActions);
        }}
      >
        <IonIcon icon={APPICONS.itemActions}></IonIcon>
      </IonButton>
    );
  };

  if (location.pathname !== VERSION_ROUTE && docId) {
    // TODO shouldn't be needed - check why
    return <Redirect to={GET_DOCUMENT_ROUTE(parentFolder, docId)} />;
  }

  if (!docId || !docVersion || !historyService.versionExists(docVersion)) {
    return <NotFoundPage />;
  }

  if (pageVersion && !historyService.versionExists(pageVersion)) {
    return <NotFoundPage />;
  }

  return (
    <TemplateCompactableSplitPage
      headerIfCompact={{
        title,
        editable: false,
        children: <CollectionItemActionsMenu />,
        color: 'tertiary'
      }}
      headerIfWide={{
        title: folderTitle, // to replace with breadcrumb
        editable: false
      }}
      menu={
        <CollectionItemBrowserList
          parent={parentFolder}
        ></CollectionItemBrowserList>
      }
      contentId="documentExplorer"
    >
      <DocumentVersionViewer
        docId={docId}
        pageId={pageId}
        docVersion={docVersion}
        pageVersion={pageVersion}
        showActions={showDocumentActions}
        folder={parentFolder}
        query={searchParams.query}
      ></DocumentVersionViewer>
    </TemplateCompactableSplitPage>
  );
};
export default VersionedItemPage;
