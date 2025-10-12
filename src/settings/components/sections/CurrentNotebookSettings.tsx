import { CollectionItemSortType } from '@/collection/collection';
import EditConfigList from '@/common/containers/EditConfigList';
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
import { Trans, useLingui } from '@lingui/react/macro';

const CurrentNotebookSettings = () => {
  const { t } = useLingui();

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
            be overriden by folder.
          </Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <EditConfigList
          rows={[
            {
              key: 'sort_by',
              label: t`Sort items by...`,
              type: 'enum',
              values: [
                { val: 'created', label: t`Creation Date` },
                { val: 'updated', label: t`Modified Date` },
                { val: 'order', label: t`Manual Order` }
              ] as { val: CollectionItemSortType; label: string }[]
            },
            {
              key: 'sort_descending',
              label: t`In descending order`,
              type: 'boolean'
            }
          ]}
          initialState={{
            sort_by: defaultDisplayOpts.sort.by,
            sort_descending: defaultDisplayOpts.sort.descending
          }}
          onChange={(key, val) => {
            console.debug('change', key, val);
            const newDisplayOpts = { ...defaultDisplayOpts };
            switch (key) {
              case 'sort_by':
                newDisplayOpts.sort.by =
                  val as string as CollectionItemSortType;
                break;
              case 'sort_descending':
                newDisplayOpts.sort.descending = val as boolean;
                break;
            }
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
