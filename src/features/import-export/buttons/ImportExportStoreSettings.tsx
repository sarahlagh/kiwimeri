import GenericExportFileButton from '@/common/buttons/GenericExportFileButton';
import GenericImportFileButton from '@/common/buttons/GenericImportFileButton';
import { dateToStr } from '@/common/date-utils';
import { DEFAULT_SPACE_ID } from '@/constants';
import { space, store } from '@/core/db/store';
import { SpaceTables, StoreTables } from '@/core/db/store-constants';
import remotesService from '@/domain/remotes/remotes.service';
import {
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';

const ImportExportStoreSettings = () => {
  const { t } = useLingui();

  const getExportFileName = () =>
    `${dateToStr('iso')}-${exportFileSuffix}.json`;

  const exportFileSuffix = 'app-settings';
  const onRestoreContent = async (content: string) => {
    const [tables, values] = JSON.parse(content);
    store.setTable(StoreTables.Remotes, tables.remotes);
    space.setTable(SpaceTables.UserPreference, tables.user_preference);
    space.setPartialValues(values);
    await remotesService.configureRemotes(DEFAULT_SPACE_ID, true);
  };
  const getContentToExport = async () => {
    // export remotes and & space values
    const remotes = store.getTable(StoreTables.Remotes);
    const user_preference = space.getTable(SpaceTables.UserPreference);
    const values = space.getValues();
    const valuesToExport = {
      ...values,
      appVersion: undefined,
      currentNotebook: undefined
    };
    return JSON.stringify([
      {
        remotes,
        user_preference
      },
      valuesToExport
    ]);
  };

  const onImportContentRead = async (content: string) => {
    await onRestoreContent(content);
    return { confirm: true };
  };

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Import & export your app settings</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>Manually backup or restore your app settings</Trans>
        </IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <Trans>
          This is different than the import / export of the collection. Your
          collection consists of your files and folders, and can be configured
          to synchronize with a cloud provider. The app settings consist of
          anything configured in this page and the Settings page.
        </Trans>
      </IonCardContent>

      <IonButtons>
        <GenericExportFileButton
          fill="clear"
          color={'primary'}
          label={t`Export`}
          icon={null}
          getFileMime={'application/json'}
          getFileTitle={getExportFileName}
          getFileContent={getContentToExport}
        />
        <GenericImportFileButton
          fill="clear"
          color="danger"
          icon={null}
          label={t`Restore`}
          onContentReadAsString={onImportContentRead}
        />
      </IonButtons>
    </IonCard>
  );
};
export default ImportExportStoreSettings;
