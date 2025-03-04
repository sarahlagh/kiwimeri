import { IonButton, IonIcon } from '@ionic/react';
import { add } from 'ionicons/icons';
import documentsService from '../../db/documents.service';

const AddDocumentButton = () => {
  function onIonClick() {
    documentsService.addDocument();
  }
  return (
    <IonButton onClick={onIonClick}>
      <IonIcon aria-hidden="true" slot="start" ios={add} md={add} />
    </IonButton>
  );
};
export default AddDocumentButton;
