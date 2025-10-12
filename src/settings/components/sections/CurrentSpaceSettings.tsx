import userSettingsService from '@/db/user-settings.service';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import GenericCollectionSettings from './GenericCollectionSettings';

const CurrentSpaceSettings = () => {
  const defaultDisplayOpts = userSettingsService.useSpaceDefaultDisplayOpts();

  return (
    <IonCard className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Space Settings</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>
            Display options for the currently selected space. They can still be
            overriden per notebook and per folder.
          </Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <GenericCollectionSettings
          defaultDisplayOpts={defaultDisplayOpts}
          onDefaultDisplayOptsChange={newDisplayOpts => {
            userSettingsService.setSpaceDefaultDisplayOpts(newDisplayOpts);
          }}
        />
      </IonCardContent>
    </IonCard>
  );
};
export default CurrentSpaceSettings;
