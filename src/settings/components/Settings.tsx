import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import ImportExportSettings from '../storage/ImportExportSettings';

const Settings = () => {
  return (
    <>
      <ImportExportSettings></ImportExportSettings>
      <IonCard disabled={true}>
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
