import { IonContent, IonHeader, IonPage } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { useParams } from 'react-router';
import DocumentList from '../../documents/components/DocumentList';
import MainHeader from '../components/MainHeader';

const DocumentListPage = () => {
  const { t } = useLingui();
  const { parent } = useParams<{ parent: string }>();
  return (
    <IonPage>
      <IonHeader>
        <MainHeader title={t`Documents`}></MainHeader>
      </IonHeader>
      <IonContent>
        <DocumentList parent={parent}></DocumentList>
      </IonContent>
    </IonPage>
  );
};
export default DocumentListPage;
