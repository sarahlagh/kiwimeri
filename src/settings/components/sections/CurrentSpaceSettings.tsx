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
              key: 'history_debounce_time',
              label: t`History save time (minutes)`,
              description: t`When working on a document, a new version will be automatically saved every XX minutes`,
              type: 'number'
            },
            {
              key: 'max_history_per_doc',
              label: t`Max number of versions kept per document`,
              description: t`The number of versions to keep per document. Set 0 for unlimited.`,
              type: 'number'
            }
          ]}
          withInitialState={{
            history_debounce_time: defaultHistoryDebounceTime / 60000,
            max_history_per_doc: defaultMaxVersionsPerDoc
          }}
          withOnChange={(key, val) => {
            if (key === 'history_debounce_time') {
              userSettingsService.setHistoryDebounceTime(
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
