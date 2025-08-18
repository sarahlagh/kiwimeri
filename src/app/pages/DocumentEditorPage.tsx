import CollectionItemBrowserList from '@/collection/components/CollectionItemBrowserList';
import DocumentEditor from '@/collection/components/DocumentEditor';
import { onTitleChangeFn } from '@/common/events/events';
import { getSearchParams } from '@/common/utils';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useState } from 'react';
import { useLocation } from 'react-router';
import TemplateCompactableSplitPage from './TemplateCompactableSplitPage';

const DocumentEditorPage = () => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const notebook = notebooksService.useCurrentNotebook();
  const docId = searchParams.document || notebook;
  const parent = searchParams.folder || notebook;
  const pageId = searchParams.page;

  const [showDocumentActions, setShowDocumentActions] = useState(false);

  const title = collectionService.useItemTitle(docId);
  const folderTitle = collectionService.useItemTitle(parent);
  const onTitleChange = onTitleChangeFn(docId);
  const onFolderTitleChange = onTitleChangeFn(parent);

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
        editable: true,
        onEdited: onTitleChange,
        children: <CollectionItemActionsMenu />
      }}
      headerIfWide={{
        title: folderTitle, // to replace with breadcrumb
        editable: parent !== notebook,
        onEdited: onFolderTitleChange
      }}
      menu={
        <CollectionItemBrowserList parent={parent}></CollectionItemBrowserList>
      }
      contentId="documentExplorer"
    >
      <DocumentEditor
        docId={docId}
        pageId={pageId}
        showActions={showDocumentActions}
      ></DocumentEditor>
    </TemplateCompactableSplitPage>
  );
};
export default DocumentEditorPage;
