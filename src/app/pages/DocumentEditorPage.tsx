import { APPICONS } from '@/constants';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { useCurrentNotebook } from '@/features/collection-notebooks-ui';
import { KiwimeriEditorHandle } from '@/features/document-editor';
import { onTitleChangeFn } from '@/shared/misc/onTitleChangeFn';
import { getSearchParams } from '@/shared/utils';
import { IonButton, IonIcon } from '@ionic/react';
import { lazy, Suspense, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import useItemTitle from '../hooks/useItemTitle';
import TemplateCompactableSplitPage from './TemplateCompactableSplitPage';

const DocumentEditor = lazy(() =>
  import('@/features/document-editor').then(m => ({
    default: m.DocumentEditor
  }))
);

const CollectionItemBrowserList = lazy(() =>
  import('@/features/collection-browser').then(m => ({
    default: m.CollectionItemBrowserList
  }))
);

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
        <Suspense>
          <CollectionItemBrowserList
            parent={parent}
          ></CollectionItemBrowserList>
        </Suspense>
      }
      onMenuClose={() => {
        if (deviceSettings.get('resumeLastSelection')) {
          editorRef.current?.focusEditor();
        }
      }}
      contentId="documentExplorer"
    >
      <Suspense>
        <DocumentEditor
          ref={editorRef}
          docId={docId}
          showActions={showDocumentActions}
          query={searchParams.query}
        ></DocumentEditor>
      </Suspense>
    </TemplateCompactableSplitPage>
  );
};
export default DocumentEditorPage;
