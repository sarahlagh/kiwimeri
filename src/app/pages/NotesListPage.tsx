import { IonContent, IonHeader, IonPage } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import MainHeader from '../components/MainHeader';
import NoteList from '../components/NoteList';

const NotesListPage = () => {
  const { t } = useLingui();
  return (
    <IonPage>
      <IonHeader>
        <MainHeader title={t`Documents`}></MainHeader>
      </IonHeader>
      <IonContent>
        <NoteList></NoteList>
      </IonContent>
    </IonPage>
  );
};
export default NotesListPage;
