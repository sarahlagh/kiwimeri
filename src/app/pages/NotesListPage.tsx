import { IonContent, IonHeader, IonPage } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import AddNoteButton from '../../common/buttons/AddNoteButton';
import MainHeader from '../components/MainHeader';
import NoteList from '../components/NoteList';

const NotesListPage = () => {
  const { t } = useLingui();
  return (
    <IonPage>
      <IonHeader>
        <MainHeader title={t`Documents`}>
          <AddNoteButton></AddNoteButton>
        </MainHeader>
      </IonHeader>
      <IonContent>
        <NoteList></NoteList>
      </IonContent>
    </IonPage>
  );
};
export default NotesListPage;
