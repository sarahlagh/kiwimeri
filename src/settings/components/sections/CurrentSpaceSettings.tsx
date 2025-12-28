import userSettingsService from '@/db/user-settings.service';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import GenericCollectionSettings from './GenericCollectionSettings';

const CurrentSpaceSettings = () => {
  const defaultDisplayOpts = userSettingsService.useSpaceDefaultDisplayOpts();
  const defaultHistoryDebounceTime =
    userSettingsService.useHistoryDebounceTime();
  const { t } = useLingui();

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
          withRows={[
            {
              key: 'history_debounce_time',
              label: t`History save time (minutes)`,
              description: t`When working on a document, a new version will be automatically saved every XX minutes`,
              type: 'number'
            }
          ]}
          withInitialState={{
            history_debounce_time: defaultHistoryDebounceTime / 60000
          }}
          withOnChange={(key, val) => {
            if (key === 'history_debounce_time') {
              userSettingsService.setHistoryDebounceTime(
                (val as number) * 60000
              );
            }
          }}
        />
      </IonCardContent>
    </IonCard>
  );
};
export default CurrentSpaceSettings;
