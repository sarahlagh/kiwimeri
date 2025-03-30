import { IonButton, IonIcon } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { ellipsisVertical } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { onTitleChangeFn } from '../../common/events/events';
import { useSearchParams } from '../../common/hooks/useSearchParams';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import DocumentActionsToolbar from '../../documents/components/DocumentActionsToolbar';
import DocumentEditor from '../../documents/components/DocumentEditor';
import DocumentList from '../../documents/components/DocumentList';
import TemplateCompactableSplitPage from './TemplateCompactableSplitPage';

const DocumentEditorPage = () => {
  const { t } = useLingui();

  const searchParams = useSearchParams();
  const docId = searchParams?.document || '-1';
  const parent = searchParams?.folder || '-1';

  const [hideDocumentActions, setHideDocumentActions] = useState(true);

  const title =
    documentsService.useDocumentNodeTitle(docId) || t`Unknown document`;
  const folderTitle = documentsService.useDocumentNodeTitle(parent) || t`Home`;
  const onTitleChange = onTitleChangeFn(docId);
  const onFolderTitleChange = onTitleChangeFn(parent);

  useEffect(() => {
    setHideDocumentActions(true);
  }, [docId]);

  const DocumentNodeActionsMenu = () => {
    return (
      <>
        <IonButton
          onClick={() => {
            setHideDocumentActions(!hideDocumentActions);
          }}
        >
          <IonIcon icon={ellipsisVertical}></IonIcon>
        </IonButton>
      </>
    );
  };

  return (
    <TemplateCompactableSplitPage
      headerIfCompact={{
        title,
        editable: true,
        onIonInput: onTitleChange,
        children: <DocumentNodeActionsMenu />
      }}
      headerIfWide={{
        title: folderTitle, // to replace with breadcrumb
        editable: parent !== ROOT_FOLDER,
        onIonInput: onFolderTitleChange,
        // TODO: remove that and move it to editor toolbar
        children: <DocumentNodeActionsMenu />
      }}
      menu={<DocumentList parent={parent}></DocumentList>}
      contentId="documentExplorer"
    >
      {!hideDocumentActions && <DocumentActionsToolbar id={docId} />}
      <DocumentEditor id={docId}></DocumentEditor>
    </TemplateCompactableSplitPage>
  );
};
export default DocumentEditorPage;
