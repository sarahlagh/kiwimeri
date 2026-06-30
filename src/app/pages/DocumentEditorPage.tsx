import CollectionItemBrowserList from '@/collection_to_migrate/components/CollectionItemBrowserList';
import DocumentEditor from '@/collection_to_migrate/components/DocumentEditor';
import { onTitleChangeFn } from '@/common_to_migrate/events/events';
import { getSearchParams } from '@/common_to_migrate/utils';
import { KiwimeriEditorHandle } from '@/common_to_migrate/wysiwyg/lexical/KiwimeriEditor';
import { APPICONS } from '@/constants';
import collectionService from '@/db_to_migrate/collection.service';
import notebooksService from '@/db_to_migrate/notebooks.service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useRef, useState } from 'react';
import { useLocation } from 'react-router';
import TemplateCompactableSplitPage from './TemplateCompactableSplitPage';

const DocumentEditorPage = () => {
  const editorRef = useRef<KiwimeriEditorHandle | null>(null);
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const notebook = notebooksService.useCurrentNotebook();
  const docId = searchParams.document || notebook;
  const parent = searchParams.folder || notebook;

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
      onMenuClose={() => {
        if (deviceSettings.get('resumeLastSelection')) {
          editorRef.current?.focusEditor();
        }
      }}
      contentId="documentExplorer"
    >
      <DocumentEditor
        ref={editorRef}
        docId={docId}
        showActions={showDocumentActions}
        query={searchParams.query}
      ></DocumentEditor>
    </TemplateCompactableSplitPage>
  );
};
export default DocumentEditorPage;
