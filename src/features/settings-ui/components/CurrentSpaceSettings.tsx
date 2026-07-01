import { settingsService } from '@/domain/collection/collection-settings.service';
import { statsService } from '@/domain/stats/stats-service';
import { userPreferenceDefinitions } from '@/domain/user-preferences/user-preferences';
import usePrefState from '@/shared/hooks/usePrefState';
import useSpaceDefaultSettings from '@/shared/hooks/useSpaceDefaultSettings';
import { cellEquals } from '@/shared/utils';
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
  const _defaultSettings = useSpaceDefaultSettings();
  const { t, i18n } = useLingui();

  const [maxHistoryPerDoc, setMaxHistoryPerDoc] =
    usePrefState('maxHistoryPerDoc');

  const [historyIdleTime, setHistoryIdleTime] = usePrefState('historyIdleTime');

  const [historyMaxInterval, setHistoryMaxInterval] =
    usePrefState('historyMaxInterval');

  return (
    <IonCard className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Space Settings</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>
            Options for the currently selected space. Some can still be
            overriden per notebook and per folder.
          </Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <GenericCollectionSettings
          defaultSettings={_defaultSettings}
          onDefaultSettingsChange={newSettings => {
            if (newSettings.statsEnabled && !_defaultSettings.statsEnabled) {
              console.log('stats setting enabled on space, backfilling');
              statsService.backfillStats();
              console.log('stats backfilling done');
            }
            if (newSettings.statsEnabled !== _defaultSettings.statsEnabled) {
              settingsService.setSpaceDefaultStatsEnabled(
                newSettings.statsEnabled
              );
            }
            if (!cellEquals(newSettings.sort, _defaultSettings.sort)) {
              settingsService.setSpaceDefaultSort(newSettings.sort);
            }
          }}
          withRows={[
            {
              key: 'historyIdleTime',
              label: i18n._(userPreferenceDefinitions['historyIdleTime'].label),
              description: t`When working on a document, a new version will be automatically if idle after XX seconds`,
              type: 'number'
            },
            {
              key: 'historyMaxInterval',
              label: i18n._(
                userPreferenceDefinitions['historyMaxInterval'].label
              ),
              description: t`When working on a document, a new version will be automatically at least every XX minutes`,
              type: 'number'
            },
            {
              key: 'maxHistoryPerDoc',
              label: i18n._(
                userPreferenceDefinitions['maxHistoryPerDoc'].label
              ),
              description: t`The number of versions to keep per document. Set 0 for unlimited.`,
              type: 'number'
            }
          ]}
          withInitialState={{
            historyIdleTime: historyIdleTime / 1000,
            historyMaxInterval: historyMaxInterval / 60000,
            maxHistoryPerDoc
          }}
          withOnChange={(key, val) => {
            if (key === 'historyIdleTime') {
              setHistoryIdleTime((val as number) * 1000);
            } else if (key === 'historyMaxInterval') {
              setHistoryMaxInterval((val as number) * 60000);
            } else if (key === 'maxHistoryPerDoc') {
              setMaxHistoryPerDoc(val as number);
            }
          }}
        />
      </IonCardContent>
    </IonCard>
  );
};
export default CurrentSpaceSettings;
