import {
  IonContent,
  IonHeader,
  IonMenu,
  IonPage,
  IonSplitPane
} from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import NoteEditor from '../../notes/components/NoteEditor';
import MainHeader from '../components/MainHeader';
import NoteList from '../components/NoteList';

type NotesExplorerPageProps = RouteComponentProps<{
  id: string;
}>;

const NotesExplorerPage = ({ match }: NotesExplorerPageProps) => {
  const { t } = useLingui();
  const [title, setTitle] = useState(() => 'Title of ' + match.params.id);
  const onTitleChange = (event: Event) => {
    const title = (event.target as HTMLInputElement).value;
    setTitle(title);
  };

  return (
    <IonPage>
      <IonHeader class="ion-hide-md-up">
        <MainHeader
          title={title}
          editable={true}
          onIonInput={onTitleChange}
        ></MainHeader>
      </IonHeader>
      <IonHeader class="ion-hide-md-down">
        <MainHeader title={t`Documents`} editable={false}></MainHeader>
      </IonHeader>
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
