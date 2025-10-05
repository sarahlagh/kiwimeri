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
            storageService.getStore().setContent([{}, {}]);
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
            storageService.getStore().setCell('remoteState', '0', 'info', '{}');
            storageService
              .getStore()
              .setCell('spaces', 'default', 'lastLocalChange', 0);
            storageService
              .getStore()
              .setCell('remoteState', '0', 'lastRemoteChange', 0);
            storageService.getStore().delTable('remoteItems');
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
