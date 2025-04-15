import CollectionItemBrowserList from '@/collection/components/CollectionItemBrowserList';
import CommonActionsToolbar from '@/collection/components/CommonActionsToolbar';
import DocumentEditor from '@/collection/components/DocumentEditor';
import { onTitleChangeFn } from '@/common/events/events';
import { getSearchParams } from '@/common/getSearchParams';
import { APPICONS, FAKE_ROOT, ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import TemplateCompactableSplitPage from './TemplateCompactableSplitPage';

const DocumentEditorPage = () => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const docId = searchParams?.document || FAKE_ROOT;
  const parent = searchParams?.folder || FAKE_ROOT;

  const [hideDocumentActions, setHideDocumentActions] = useState(true);

  const title = collectionService.useItemTitle(docId);
  const folderTitle = collectionService.useItemTitle(parent);
  const onTitleChange = onTitleChangeFn(docId);
  const onFolderTitleChange = onTitleChangeFn(parent);

  useEffect(() => {
    setHideDocumentActions(true);
  }, [docId]);

  const CollectionItemActionsMenu = () => {
    return (
      <>
        <IonButton
          onClick={() => {
            setHideDocumentActions(!hideDocumentActions);
          }}
        >
          <IonIcon icon={APPICONS.itemActions}></IonIcon>
        </IonButton>
      </>
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
        editable: parent !== ROOT_FOLDER,
        onEdited: onFolderTitleChange,
        // TODO: remove that and move it to editor toolbar
        children: <CollectionItemActionsMenu />
      }}
      menu={
        <CollectionItemBrowserList parent={parent}></CollectionItemBrowserList>
      }
      contentId="documentExplorer"
    >
      {!hideDocumentActions && (
        <CommonActionsToolbar
          id={docId}
          showClose={true}
          onClose={() => {
            setHideDocumentActions(true);
          }}
        />
      )}
      <DocumentEditor id={docId}></DocumentEditor>
    </TemplateCompactableSplitPage>
  );
};
export default DocumentEditorPage;
