import {
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useRef } from 'react';
import DeleteDocumentButton from '../../common/buttons/DeleteDocumentButton';
import { onTitleChangeFn } from '../../common/events/events';
import Writer from '../../common/wysiwyg/Writer';
import documentsService from '../../db/documents.service';

interface DocumentEditorProps {
  id: string;
}

const DocumentEditor = ({ id }: DocumentEditorProps) => {
  const refWriter = useRef(null);
  const document = documentsService.getDocument(id);
  const onTitleChange = onTitleChangeFn(id);
  const onContentChange = (content: string) => {
    // workaround because "delete" button triggers the event - find a better way
    if (documentsService.documentExists(id)) {
      documentsService.setDocumentContent(id, content);
    }
  };
  const onClickedAnywhere: React.MouseEventHandler<HTMLIonContentElement> = (
    event: React.MouseEvent<HTMLIonContentElement, MouseEvent>
  ) => {
    const target = event.target as HTMLIonContentElement;
    // exclude text area & toolbar from this handler
    // focus the text editor when clicking on empty ion-content
    if (
      refWriter.current &&
      target.role === 'main' &&
      target.localName === 'ion-content'
    ) {
      const ref = refWriter.current as HTMLBaseElement;
      ref.focus();
    }
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
      <IonContent onClick={onClickedAnywhere}>
        <DeleteDocumentButton id={id}></DeleteDocumentButton>
        <Writer
          ref={refWriter}
          content={document.content}
          onContentChange={onContentChange}
        ></Writer>
      </IonContent>
    </>
  );
};
export default DocumentEditor;
