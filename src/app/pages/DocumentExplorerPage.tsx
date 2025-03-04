import {
  IonContent,
  IonHeader,
  IonMenu,
  IonPage,
  IonSplitPane
} from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { RouteComponentProps } from 'react-router-dom';
import AddDocumentButton from '../../common/buttons/AddDocumentButton';
import { onTitleChangeFn } from '../../common/events/events';
import documentsService from '../../db/documents.service';
import DocumentEditor from '../../documents/components/DocumentEditor';
import DocumentList from '../components/DocumentList';
import MainHeader from '../components/MainHeader';

type DocumentExplorerPageProps = RouteComponentProps<{
  id: string;
}>;

const DocumentExplorerPage = ({ match }: DocumentExplorerPageProps) => {
  const { t } = useLingui();
  const id = match.params.id;
  const title = documentsService.getDocumentTitle(id) || 'Unknown document';
  const onTitleChange = onTitleChangeFn(id);
  return (
    <IonPage>
      {/* header on small screens */}
      <IonHeader class="ion-hide-md-up">
        <MainHeader
          title={title}
          editable={true}
          onIonInput={onTitleChange}
        ></MainHeader>
      </IonHeader>
      {/* header on large screens */}
      <IonHeader class="ion-hide-md-down">
        <MainHeader title={t`Documents`} editable={false}>
          <AddDocumentButton></AddDocumentButton>
        </MainHeader>
      </IonHeader>
      {/* content */}
      <IonContent>
        <IonSplitPane when="md" contentId="documentExplorer">
          <IonMenu contentId="documentExplorer">
            <IonContent>
              <DocumentList></DocumentList>
            </IonContent>
          </IonMenu>

          <div className="ion-page" id="documentExplorer">
            <DocumentEditor id={match.params.id}></DocumentEditor>
          </div>
        </IonSplitPane>
      </IonContent>
    </IonPage>
  );
};
export default DocumentExplorerPage;
