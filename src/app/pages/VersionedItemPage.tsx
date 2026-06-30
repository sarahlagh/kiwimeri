import CollectionItemBrowserList from '@/collection_to_migrate/components/CollectionItemBrowserList';
import { GET_DOCUMENT_ROUTE, VERSION_ROUTE } from '@/common_to_migrate/routes';
import { getSearchParams } from '@/common_to_migrate/utils';
import { APPICONS } from '@/constants';
import collectionService from '@/db_to_migrate/collection.service';
import { historyService } from '@/domain/history/history.service';
import { DocumentVersionViewer } from '@/features/collection-history-ui';
import { useCurrentNotebook } from '@/features/notebooks-ui';
import { IonButton, IonIcon } from '@ionic/react';
import { useState } from 'react';
import { Redirect, useLocation } from 'react-router';
import NotFoundPage from './NotFoundPage';
import TemplateCompactableSplitPage from './TemplateCompactableSplitPage';

const VersionedItemPage = () => {
  const location = useLocation();
  const notebook = useCurrentNotebook();
  const searchParams = getSearchParams(location.search);
  const docId = searchParams.document;
  const parentFolder = searchParams.folder || notebook;
  const docVersion = searchParams.docVersion;

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
        docVersion={docVersion}
        showActions={showDocumentActions}
        folder={parentFolder}
        query={searchParams.query}
      ></DocumentVersionViewer>
    </TemplateCompactableSplitPage>
  );
};
export default VersionedItemPage;
