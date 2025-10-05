import storageService from '@/db/storage.service';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';

const OperationCard = () => {
  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Operations</Trans>
        </IonCardTitle>
      </IonCardHeader>

      <IonButtons>
        <IonButton
          fill="clear"
          onClick={() => {
            storageService.getStore().setContent([{}, {}]);
          }}
          color="danger"
        >
          <Trans>nuke store</Trans>
        </IonButton>
        <IonButton
          fill="clear"
          onClick={() => {
            storageService.nukeSpace();
          }}
          color="danger"
        >
          <Trans>nuke space</Trans>
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
          <Trans>nuke space & remote</Trans>
        </IonButton>
      </IonButtons>
    </IonCard>
  );
};
export default OperationCard;
