import { IonContent, IonHeader, IonPage } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import AddDocumentButton from '../../common/buttons/AddDocumentButton';
import DocumentList from '../../documents/components/DocumentList';
import MainHeader from '../components/MainHeader';

const DocumentListPage = () => {
  const { t } = useLingui();
  return (
    <IonPage>
      <IonHeader>
        <MainHeader title={t`Documents`}>
          <AddDocumentButton></AddDocumentButton>
        </MainHeader>
      </IonHeader>
      <IonContent>
        <DocumentList></DocumentList>
      </IonContent>
    </IonPage>
  );
};
export default DocumentListPage;
