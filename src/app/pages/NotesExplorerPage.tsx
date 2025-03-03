import {
  IonContent,
  IonHeader,
  IonMenu,
  IonSplitPane,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { RouteComponentProps } from 'react-router-dom';
import NoteList from '../components/NoteList';

type NotesExplorerPageProps = RouteComponentProps<{
  id: string;
}>;

const NotesExplorerPage: React.FC<NotesExplorerPageProps> = ({
  match
}: NotesExplorerPageProps) => {
  return (
    <IonSplitPane when="md" contentId="noteExplorer">
      <IonMenu contentId="noteExplorer">
        <IonContent className="ion-padding">
          <NoteList></NoteList>
        </IonContent>
      </IonMenu>

      <div className="ion-page" id="noteExplorer">
        {match.params.id && (
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
        )}
      </div>
    </IonSplitPane>
  );
};
export default NotesExplorerPage;
