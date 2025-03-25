import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenu,
  IonPage,
  IonSplitPane
} from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { ellipsisVertical } from 'ionicons/icons';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { onTitleChangeFn } from '../../common/events/events';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import DocumentActionsToolbar from '../../documents/components/DocumentActionsToolbar';
import DocumentEditor from '../../documents/components/DocumentEditor';
import DocumentList from '../../documents/components/DocumentList';
import MainHeader from '../components/MainHeader';

const DocumentExplorerPage = () => {
  const { t } = useLingui();

  const { id: docId, parent } = useParams<{ id: string; parent: string }>();

  const title =
    documentsService.useDocumentNodeTitle(docId) || t`Unknown document`;
  const folderTitle = documentsService.useDocumentNodeTitle(parent) || t`Home`;
  const onTitleChange = onTitleChangeFn(docId);
  const onFolderTitleChange = onTitleChangeFn(parent);

  const [hideDocumentActions, setHideDocumentActions] = useState(true);

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
    <IonPage>
      {/* header on small screens */}
      <IonHeader class="ion-hide-md-up">
        <MainHeader title={title} editable={true} onIonInput={onTitleChange}>
          <DocumentNodeActionsMenu />
        </MainHeader>
      </IonHeader>
      {/* header on large screens */}
      <IonHeader class="ion-hide-md-down">
        <MainHeader
          title={folderTitle}
          editable={parent !== ROOT_FOLDER}
          onIonInput={onFolderTitleChange}
        >
          <DocumentNodeActionsMenu />
        </MainHeader>
      </IonHeader>
      {/* content */}
      <IonContent>
        <IonSplitPane when="md" contentId="documentExplorer">
          <IonMenu contentId="documentExplorer">
            <IonContent>
              <DocumentList parent={parent}></DocumentList>
            </IonContent>
          </IonMenu>

          <div className="ion-page" id="documentExplorer">
            {!hideDocumentActions && <DocumentActionsToolbar id={docId} />}
            <DocumentEditor id={docId}></DocumentEditor>
          </div>
        </IonSplitPane>
      </IonContent>
    </IonPage>
  );
};
export default DocumentExplorerPage;
