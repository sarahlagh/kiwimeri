import { IonContent, IonHeader, IonPage } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import DocumentList from '../../documents/components/DocumentList';
import MainHeader from '../components/MainHeader';

const DocumentListPage = () => {
  const { t } = useLingui();
  return (
    <IonPage>
      <IonHeader>
        <MainHeader title={t`Documents`}></MainHeader>
      </IonHeader>
      <IonContent>
        <DocumentList></DocumentList>
      </IonContent>
    </IonPage>
  );
};
export default DocumentListPage;
