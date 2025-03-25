import { IonContent, IonHeader, IonPage } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { useParams } from 'react-router';
import { onTitleChangeFn } from '../../common/events/events';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import DocumentList from '../../documents/components/DocumentList';
import MainHeader from '../components/MainHeader';

const DocumentListPage = () => {
  const { t } = useLingui();
  const { parent } = useParams<{ parent: string }>();
  const folderTitle = documentsService.useDocumentNodeTitle(parent) || t`Home`;
  const onFolderTitleChange = onTitleChangeFn(parent);
  return (
    <IonPage>
      <IonHeader>
        <MainHeader
          title={folderTitle}
          editable={parent !== ROOT_FOLDER}
          onIonInput={onFolderTitleChange}
        ></MainHeader>
      </IonHeader>
      <IonContent>
        <DocumentList parent={parent}></DocumentList>
      </IonContent>
    </IonPage>
  );
};
export default DocumentListPage;
