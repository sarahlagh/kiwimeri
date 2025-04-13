import { onTitleChangeFn } from '@/common/events/events';
import Writer from '@/common/wysiwyg/Writer';
import documentsService from '@/db/documents.service';
import {
  InputCustomEvent,
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useRef } from 'react';

interface DocumentEditorProps {
  id: string;
}

const DocumentEditor = ({ id }: DocumentEditorProps) => {
  const refWriter = useRef(null);
  const documentTitle = documentsService.getDocumentNodeTitle(id);
  const documentContent = documentsService.useDocumentNodeContent(id);
  const onTitleChange = onTitleChangeFn(id);
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
              value={documentTitle}
              onIonChange={(e: InputCustomEvent) => {
                if (typeof e.detail.value === 'string') {
                  onTitleChange(e.detail.value || '');
                }
              }}
            ></IonInput>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent onClick={onClickedAnywhere}>
        {documentContent && (
          <Writer ref={refWriter} id={id} content={documentContent}></Writer>
        )}
      </IonContent>
    </>
  );
};
export default DocumentEditor;
