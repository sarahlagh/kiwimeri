import { GET_DOCUMENT_ROUTE, VERSION_ROUTE } from '@/app/routes';
import { APPICONS } from '@/constants';
import { historyService } from '@/domain/history/history.service';
import { CollectionItemBrowserList } from '@/features/collection-browser';
import { DocumentVersionViewer } from '@/features/collection-history-ui';
import { useCurrentNotebook } from '@/features/collection-notebooks-ui';
import { getSearchParams } from '@/shared/utils';
import { IonButton, IonIcon } from '@ionic/react';
import { useState } from 'react';
import { Redirect, useLocation } from 'react-router';
import useItemTitle from '../hooks/useItemTitle';
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

  const title = useItemTitle(docId || '');
  const folderTitle = useItemTitle(parentFolder || '');

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
