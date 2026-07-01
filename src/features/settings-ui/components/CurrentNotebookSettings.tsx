import { settingsService } from '@/domain/collection/collection-settings.service';
import collectionService from '@/domain/collection/collection.service';
import useNotebookDefaultSettings from '@/domain/collection/hooks/useNotebookDefaultSettings';
import { statsService } from '@/domain/stats/stats-service';
import { useCurrentNotebook } from '@/features/collection-notebooks-ui';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import GenericCollectionSettings from './GenericCollectionSettings';

const CurrentNotebookSettings = () => {
  const _defaultSettings = useNotebookDefaultSettings();
  const currentNotebook = useCurrentNotebook();
  const notebookTitle = collectionService.getItemTitle(currentNotebook);

  return (
    <IonCard className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Current Notebook Settings ({notebookTitle})</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>
            Display options for the currently selected notebook. They can still
            be overriden per folder.
          </Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <GenericCollectionSettings
          defaultSettings={_defaultSettings}
          onDefaultSettingsChange={newSettings => {
            if (newSettings.statsEnabled && !_defaultSettings.statsEnabled) {
              console.log('stats setting enabled on notebook, backfilling');
              statsService.backfillStats(currentNotebook);
              console.log('stats backfilling done');
            }
            settingsService.setNotebookSettings(currentNotebook, newSettings);
          }}
        />
      </IonCardContent>
    </IonCard>
  );
};
export default CurrentNotebookSettings;
