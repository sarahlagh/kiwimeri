import { IonContent, IonMenu, IonPage, IonSplitPane } from '@ionic/react';
import { RouteComponentProps } from 'react-router-dom';
import NoteEditor from '../../notes/components/NoteEditor';
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
          <NoteEditor id={match.params.id}></NoteEditor>
        </div>
      </IonSplitPane>
    </IonPage>
  );
};
export default NotesExplorerPage;
