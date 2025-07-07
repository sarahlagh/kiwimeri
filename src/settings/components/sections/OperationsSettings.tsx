import localChangesService from '@/db/localChanges.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import tagsService from '@/db/tags.service';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';

const OperationSettings = () => {
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
            storageService.getSpace().setContent([{}, {}]);
            localChangesService.clear();
            tagsService.reBuildTags();
            notebooksService.initNotebooks();
          }}
          color="danger"
        >
          <Trans>nuke space</Trans>
        </IonButton>
        <IonButton
          fill="clear"
          onClick={() => {
            storageService.getSpace().setContent([{}, {}]);
            localChangesService.clear();
            storageService.getStore().setCell('remoteState', '0', 'info', '{}');
            storageService
              .getStore()
              .setCell('spaces', 'default', 'lastLocalChange', 0);
            storageService
              .getStore()
              .setCell('remoteState', '0', 'lastRemoteChange', 0);
            storageService.getStore().delTable('remoteItems');
            tagsService.reBuildTags();
            notebooksService.initNotebooks();
          }}
          color="danger"
        >
          <Trans>nuke space & remote</Trans>
        </IonButton>
      </IonButtons>
    </IonCard>
  );
};
export default OperationSettings;
