import CollectionItemBrowserList from '@/collection/components/CollectionItemBrowserList';
import DocumentVersionViewer from '@/collection/components/DocumentVersionViewer';
import { getSearchParams } from '@/common/utils';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useState } from 'react';
import { useLocation } from 'react-router';
import TemplateCompactableSplitPage from './TemplateCompactableSplitPage';

const VersionedItemPage = () => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const notebook = notebooksService.useCurrentNotebook();
  const docId = searchParams.document || notebook;
  const parent = searchParams.folder || notebook;
  const pageId = searchParams.page;
  const version =
    searchParams.version === undefined ? 0 : parseInt(searchParams.version);

  const [showDocumentActions, setShowDocumentActions] = useState(false);

  const title = collectionService.useItemTitle(docId);
  const folderTitle = collectionService.useItemTitle(parent);

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

  return (
    <TemplateCompactableSplitPage
      headerIfCompact={{
        title,
        editable: false,
        children: <CollectionItemActionsMenu />
      }}
      headerIfWide={{
        title: folderTitle, // to replace with breadcrumb
        editable: false
      }}
      menu={
        <CollectionItemBrowserList parent={parent}></CollectionItemBrowserList>
      }
      contentId="documentExplorer"
    >
      <DocumentVersionViewer
        docId={docId}
        pageId={pageId}
        version={version}
        showActions={showDocumentActions}
        query={searchParams.query}
      ></DocumentVersionViewer>
    </TemplateCompactableSplitPage>
  );
};
export default VersionedItemPage;
