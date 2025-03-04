import {
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import documentsService from '../../app/db/documents.service';
import { onContentChangeFn, onTitleChangeFn } from '../../app/events/events';
import DeleteNoteButton from '../../common/buttons/DeleteNoteButton';
import Writer from './Writer';

interface NoteEditorProps {
  id: string;
}

const NoteEditor = ({ id }: NoteEditorProps) => {
  const note = documentsService.getDocument(id);
  const onTitleChange = onTitleChangeFn(id);
  const onContentChange = onContentChangeFn(id);
  return (
    <>
      <IonHeader class="ion-hide-md-down">
        <IonToolbar>
          <IonTitle>
            <IonInput
              class="invisible"
              value={note.title}
              onIonInput={onTitleChange}
            ></IonInput>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <DeleteNoteButton id={id}></DeleteNoteButton>
        <Writer content={note.content} onIonInput={onContentChange}></Writer>
      </IonContent>
    </>
  );
};
export default NoteEditor;
