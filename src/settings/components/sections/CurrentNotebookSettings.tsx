import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
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

const CurrentNotebookSettings = () => {
  const defaultDisplayOpts = userSettingsService.useDefaultDisplayOpts();
  const currentNotebook = notebooksService.useCurrentNotebook();
  const notebookTitle = notebooksService.useNotebookTitle(currentNotebook);
  console.debug('default display opts', currentNotebook, defaultDisplayOpts);

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
          defaultDisplayOpts={defaultDisplayOpts}
          onDefaultDisplayOptsChange={newDisplayOpts => {
            collectionService.setItemDisplayOpts(
              currentNotebook,
              newDisplayOpts
            );
          }}
        />
      </IonCardContent>
    </IonCard>
  );
};
export default CurrentNotebookSettings;
