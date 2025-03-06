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
import ImportExportCollectionSettings from '../storage/ImportExportCollectionSettings';
const Settings = () => {
  const isWeb = isPlatform('desktop') && getPlatforms().length === 1;

  return (
    <>
      <ImportExportCollectionSettings></ImportExportCollectionSettings>
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
    </>
  );
};
export default Settings;
