import { IonButton, IonIcon } from '@ionic/react';
import { add } from 'ionicons/icons';

const AddNoteButton = () => {
  return (
    <IonButton>
      <IonIcon aria-hidden="true" slot="start" ios={add} md={add} />
    </IonButton>
  );
};
export default AddNoteButton;
