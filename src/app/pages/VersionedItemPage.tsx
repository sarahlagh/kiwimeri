import CollectionItemBrowserList from '@/collection/components/CollectionItemBrowserList';
import DocumentVersionViewer from '@/collection/components/DocumentVersionViewer';
import { getSearchParams } from '@/common/utils';
import { APPICONS } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useState } from 'react';
import { useLocation } from 'react-router';
import NotFound from '../components/NotFound';
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

  if (!docId || !docVersion || !historyService.versionExists(docVersion)) {
    return <NotFound />;
  }

  if (pageVersion && !historyService.versionExists(pageVersion)) {
    return <NotFound />;
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
