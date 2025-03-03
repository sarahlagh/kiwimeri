import {
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useState } from 'react';
import { Note } from '../note';
import Writer from './Writer';

interface NoteEditorProps {
  id: string;
}

const NoteEditor = ({ id }: NoteEditorProps) => {
  const [note, setNote] = useState(
    () => ({ id, title: 'Title of ' + id, content: 'Content of ' + id }) as Note
  );

  const onTitleChange = (event: Event) => {
    const title = (event.target as HTMLInputElement).value;
    setNote({ ...note, title });
  };

  const onContentChange = (event: Event) => {
    const content = (event.target as HTMLInputElement).value;
    setNote({ ...note, content });
  };

  return (
    <>
      <IonHeader>
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
        <Writer content={note.content} onIonInput={onContentChange}></Writer>
      </IonContent>
    </>
  );
};
export default NoteEditor;
