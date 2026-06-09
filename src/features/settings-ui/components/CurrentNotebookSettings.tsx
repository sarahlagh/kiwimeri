import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { displayOptsService } from '@/domain/collection-display-opts/display-opts.service';
import useNotebookDefaultSort from '@/domain/collection-display-opts/hooks/useNotebookDefaultSort';
import useNotebookDefaultFlags from '@/domain/collection-flags/hooks/useNotebookDefaultFlags';
import { statsService } from '@/domain/stats/stats-service';
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
  const _defaultDisplayOpts = useNotebookDefaultSort();
  const _defaultFlags = useNotebookDefaultFlags();
  const currentNotebook = notebooksService.useCurrentNotebook();
  const notebookTitle = notebooksService.useNotebookTitle(currentNotebook);

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
          defaultSort={_defaultDisplayOpts}
          defaultFlags={_defaultFlags}
          onDefaultSortChange={newSort => {
            displayOptsService.setNotebookDefaultSort(currentNotebook, newSort);
          }}
          onDefaultFlagsChange={newFlags => {
            if (newFlags.statsEnabled && !_defaultFlags.statsEnabled) {
              console.log('stats setting enabled on notebook, backfilling');
              statsService.backfillStats(currentNotebook);
              console.log('stats backfilling done');
            }
            collectionService.setItemFlags(currentNotebook, newFlags);
          }}
        />
      </IonCardContent>
    </IonCard>
  );
};
export default CurrentNotebookSettings;
