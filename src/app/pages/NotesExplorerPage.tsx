import {
  IonContent,
  IonHeader,
  IonMenu,
  IonPage,
  IonSplitPane,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { RouteComponentProps } from 'react-router-dom';
import NoteList from '../components/NoteList';

type NotesExplorerPageProps = RouteComponentProps<{
  id: string;
}>;

const NotesExplorerPage = ({ match }: NotesExplorerPageProps) => {
  return (
    <IonPage>
      <IonSplitPane when="md" contentId="noteExplorer">
        <IonMenu contentId="noteExplorer">
          <IonContent>
            <NoteList></NoteList>
          </IonContent>
        </IonMenu>

        <div className="ion-page" id="noteExplorer">
          <>
            <IonHeader>
              <IonToolbar>
                <IonTitle>Note {match.params.id}</IonTitle>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              Content of Note {match.params.id}
            </IonContent>
          </>
        </div>
      </IonSplitPane>
    </IonPage>
  );
};
export default NotesExplorerPage;
