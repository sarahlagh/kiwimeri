import {
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import DeleteDocumentButton from '../../common/buttons/DeleteDocumentButton';
import { onContentChangeFn, onTitleChangeFn } from '../../common/events/events';
import documentsService from '../../db/documents.service';
import Writer from './Writer';

interface DocumentEditorProps {
  id: string;
}

const DocumentEditor = ({ id }: DocumentEditorProps) => {
  const document = documentsService.getDocument(id);
  const onTitleChange = onTitleChangeFn(id);
  const onContentChange = onContentChangeFn(id);
  return (
    <>
      <IonHeader class="ion-hide-md-down">
        <IonToolbar>
          <IonTitle>
            <IonInput
              class="invisible"
              value={document.title}
              onIonInput={onTitleChange}
            ></IonInput>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <DeleteDocumentButton id={id}></DeleteDocumentButton>
        <Writer
          content={document.content}
          onIonInput={onContentChange}
        ></Writer>
      </IonContent>
    </>
  );
};
export default DocumentEditor;
