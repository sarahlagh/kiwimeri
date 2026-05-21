import { store } from '@/core/db/store';
import storageService from '@/db/storage.service';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle
} from '@ionic/react';

const OperationCard = () => {
  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>Operations</IonCardTitle>
      </IonCardHeader>

      <IonButtons>
        <IonButton
          fill="clear"
          onClick={() => {
            store.setContent([{}, {}]);
          }}
          color="danger"
        >
          nuke store
        </IonButton>
        <IonButton
          fill="clear"
          onClick={() => {
            storageService.nukeSpace();
          }}
          color="danger"
        >
          nuke space
        </IonButton>
        <IonButton
          fill="clear"
          onClick={() => {
            storageService.nukeSpace();
            store.setCell('remoteState', '0', 'info', '{}');
            store.setCell('remoteState', '0', 'lastRemoteChange', 0);
          }}
          color="danger"
        >
          nuke space & remote
        </IonButton>
      </IonButtons>
    </IonCard>
  );
};
export default OperationCard;
