import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import storageService from '../../db/storage.service';
import ImportExportCollectionSettings from '../storage/ImportExportCollectionSettings';
const Settings = () => {
  return (
    <>
      {/* <FilesystemSyncSettings></FilesystemSyncSettings> */}
      <ImportExportCollectionSettings></ImportExportCollectionSettings>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>
            <Trans>Operations</Trans>
          </IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonButton
            fill="clear"
            onClick={() => {
              storageService.getStore().setContent([{}, {}]);
            }}
            color="danger"
          >
            <Trans>nuke db</Trans>
          </IonButton>
        </IonCardContent>
      </IonCard>
    </>
  );
};
export default Settings;
