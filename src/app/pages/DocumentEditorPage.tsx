import { APPICONS } from '@/constants';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { CollectionItemBrowserList } from '@/features/collection-browser';
import { useCurrentNotebook } from '@/features/collection-notebooks-ui';
import {
  DocumentEditor,
  KiwimeriEditorHandle
} from '@/features/document-editor';
import { onTitleChangeFn } from '@/shared/misc/onTitleChangeFn';
import { getSearchParams } from '@/shared/utils';
import { IonButton, IonIcon } from '@ionic/react';
import { useRef, useState } from 'react';
import { useLocation } from 'react-router';
import useItemTitle from '../hooks/useItemTitle';
import TemplateCompactableSplitPage from './TemplateCompactableSplitPage';

const DocumentEditorPage = () => {
  const editorRef = useRef<KiwimeriEditorHandle | null>(null);
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const notebook = useCurrentNotebook();
  const docId = searchParams.document || notebook;
  const parent = searchParams.folder || notebook;

  const [showDocumentActions, setShowDocumentActions] = useState(false);

  const title = useItemTitle(docId);
  const folderTitle = useItemTitle(parent);
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
