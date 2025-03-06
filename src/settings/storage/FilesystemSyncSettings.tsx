import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import platformService from '../../common/services/platform.service';
const FilesystemSyncSettings = () => {
  return (
    <IonCard disabled={platformService.isWeb()}>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Filesystem</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>Synchronize your collection on the filesystem</Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>Form goes here</IonCardContent>
    </IonCard>
  );
};
export default FilesystemSyncSettings;
