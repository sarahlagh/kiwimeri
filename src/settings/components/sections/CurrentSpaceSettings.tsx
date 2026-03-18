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
  const defaultHistoryIdleTime = userSettingsService.useHistoryIdleTime();
  const defaultHistoryMaxInterval = userSettingsService.useHistoryMaxInterval();
  const defaultMaxVersionsPerDoc = userSettingsService.useHistoryMaxVersions();
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
              key: 'history_idle_time',
              label: t`History idle time (s)`,
              description: t`When working on a document, a new version will be automatically if idle after XX seconds`,
              type: 'number'
            },
            {
              key: 'history_max_interval',
              label: t`History save time (min)`,
              description: t`When working on a document, a new version will be automatically at least every XX minutes`,
              type: 'number'
            },
            {
              key: 'max_history_per_doc',
              label: t`Number of versions`,
              description: t`The number of versions to keep per document. Set 0 for unlimited.`,
              type: 'number'
            }
          ]}
          withInitialState={{
            history_idle_time: defaultHistoryIdleTime / 1000,
            history_max_interval: defaultHistoryMaxInterval / 60000,
            max_history_per_doc: defaultMaxVersionsPerDoc
          }}
          withOnChange={(key, val) => {
            if (key === 'history_idle_time') {
              userSettingsService.setHistoryIdleTime((val as number) * 1000);
            } else if (key === 'history_max_interval') {
              userSettingsService.setHistoryMaxInterval(
                (val as number) * 60000
              );
            } else if (key === 'max_history_per_doc') {
              userSettingsService.setHistoryMaxVersions(val as number);
            }
          }}
        />
      </IonCardContent>
    </IonCard>
  );
};
export default CurrentSpaceSettings;
