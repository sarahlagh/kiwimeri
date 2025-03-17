import {
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import DeleteDocumentButton from '../../common/buttons/DeleteDocumentButton';
import { onTitleChangeFn } from '../../common/events/events';
import Writer from '../../common/wysiwyg/Writer';
import documentsService from '../../db/documents.service';

interface DocumentEditorProps {
  id: string;
}

const DocumentEditor = ({ id }: DocumentEditorProps) => {
  const document = documentsService.getDocument(id);
  const onTitleChange = onTitleChangeFn(id);
  const onContentChange = (content: string) => {
    console.log('writing to db', id, content);
    documentsService.setDocumentContent(id, content);
  };
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
      <IonContent className="ion-padding scroll" scroll-overflow="true">
        <DeleteDocumentButton id={id}></DeleteDocumentButton>
        <Writer
          content={document.content}
          onContentChange={onContentChange}
        ></Writer>
      </IonContent>
    </>
  );
};
export default DocumentEditor;
