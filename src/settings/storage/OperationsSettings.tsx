import { IonButton, IonCard, IonCardHeader, IonCardTitle } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import storageService from '../../db/storage.service';

const OperationSettings = () => {
  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Operations</Trans>
        </IonCardTitle>
      </IonCardHeader>

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
          storageService.getSpace().setContent([{}, {}]);
        }}
        color="danger"
      >
        <Trans>nuke space</Trans>
      </IonButton>
    </IonCard>
  );
};
export default OperationSettings;
