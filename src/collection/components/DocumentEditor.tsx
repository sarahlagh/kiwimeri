import { onTitleChangeFn } from '@/common/events/events';
import Writer from '@/common/wysiwyg/Writer';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import {
  InputCustomEvent,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import CommonActionsToolbar from './CommonActionsToolbar';

interface DocumentEditorProps {
  id: string;
  showActions?: boolean;
}

const DocumentEditor = ({ id, showActions = false }: DocumentEditorProps) => {
  const refWriter = useRef(null);
  const [showDocumentActions, setShowDocumentActions] = useState(showActions);
  useEffect(() => {
    setShowDocumentActions(showActions); // can be triggered from parent
  }, [showActions]);

  const documentTitle = collectionService.getItemTitle(id);
  const documentContent = collectionService.useItemContent(id);
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
      <IonHeader>
        <IonToolbar class="ion-hide-md-down">
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
          <IonButton
            slot="end"
            fill="clear"
            color={'dark'}
            onClick={() => {
              setShowDocumentActions(!showDocumentActions);
            }}
          >
            <IonIcon icon={APPICONS.itemActions}></IonIcon>
          </IonButton>
        </IonToolbar>
        {showDocumentActions && (
          <CommonActionsToolbar
            id={id}
            showClose={true}
            showInfo={true}
            onClose={() => {
              setShowDocumentActions(false);
            }}
          />
        )}
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
