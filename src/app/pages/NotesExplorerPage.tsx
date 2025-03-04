import {
  IonContent,
  IonHeader,
  IonMenu,
  IonPage,
  IonSplitPane
} from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { RouteComponentProps } from 'react-router-dom';
import AddNoteButton from '../../common/buttons/AddNoteButton';
import NoteEditor from '../../notes/components/NoteEditor';
import MainHeader from '../components/MainHeader';
import NoteList from '../components/NoteList';
import documentsService from '../db/documents.service';
import { onTitleChangeFn } from '../events/events';

type NotesExplorerPageProps = RouteComponentProps<{
  id: string;
}>;

const NotesExplorerPage = ({ match }: NotesExplorerPageProps) => {
  const { t } = useLingui();
  const id = match.params.id;
  const title = documentsService.getDocumentTitle(id) || 'Unknown Note';
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
          <AddNoteButton></AddNoteButton>
        </MainHeader>
      </IonHeader>
      {/* content */}
      <IonContent>
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
      </IonContent>
    </IonPage>
  );
};
export default NotesExplorerPage;
