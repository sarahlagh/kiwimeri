import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { DocumentEditorHandle } from '@/features/document-editor';
import { onTitleChangeFn } from '@/shared/misc/onTitleChangeFn';
import { lazy, Suspense, useRef, useState } from 'react';
import { useStableRouteContext } from '../context/RouteContext';
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
  const editorRef = useRef<DocumentEditorHandle | null>(null);
  const routeCtx = useStableRouteContext();
  const notebook = routeCtx.notebook;
  const docId = routeCtx.document || notebook;
  const parent = routeCtx.folder;

  const [showDocumentActions, setShowDocumentActions] = useState(false);

  const title = useItemTitle(docId);
  const folderTitle = useItemTitle(parent);
  const onTitleChange = onTitleChangeFn(docId);
  const onFolderTitleChange = onTitleChangeFn(parent);

  return (
    <TemplateCompactableSplitPage
      headerIfCompact={{
        title,
        editable: true,
        onEdited: onTitleChange,
        showActions: true,
        onActionsClick: () => setShowDocumentActions(!showDocumentActions)
      }}
      headerIfWide={{
        title: folderTitle, // to replace with breadcrumb
        editable: parent !== notebook,
        onEdited: onFolderTitleChange
      }}
      menu={
        <Suspense>
          <CollectionItemBrowserList
            parentId={parent}
            documentId={docId}
          ></CollectionItemBrowserList>
        </Suspense>
      }
      onMenuClose={() => {
        if (deviceSettings.get('resumeLastSelection')) {
          editorRef.current?.focusEditor();
        }
      }}
      onSync={resp => {
        if (resp.success) editorRef.current?.refreshContent();
      }}
      contentId="documentExplorer"
    >
      <Suspense>
        <DocumentEditor
          ref={editorRef}
          docId={docId}
          showActions={showDocumentActions}
          // query={searchParams.query}
        />
      </Suspense>
    </TemplateCompactableSplitPage>
  );
};
export default DocumentEditorPage;
