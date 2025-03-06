import {
  getPlatforms,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  isPlatform
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
const FilesystemSyncSettings = () => {
  const isWeb = isPlatform('desktop') && getPlatforms().length === 1;

  return (
    <IonCard disabled={isWeb}>
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
