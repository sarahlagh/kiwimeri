import { IonButton, IonIcon } from '@ionic/react';
import { add } from 'ionicons/icons';
import documentsService from '../../app/db/documents.service';

const AddNoteButton = () => {
  function onIonClick() {
    documentsService.addDocument();
  }
  return (
    <IonButton onClick={onIonClick}>
      <IonIcon aria-hidden="true" slot="start" ios={add} md={add} />
    </IonButton>
  );
};
export default AddNoteButton;
