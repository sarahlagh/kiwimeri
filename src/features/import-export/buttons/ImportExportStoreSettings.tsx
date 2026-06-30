import GenericExportFileButton from '@/common_to_migrate/buttons/GenericExportFileButton';
import GenericImportFileButton from '@/common_to_migrate/buttons/GenericImportFileButton';
import { dateToStr } from '@/common_to_migrate/date-utils';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { syncService } from '@/domain/synchronization/sync.service';
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
    space.setTable(SpaceTables.Remote, tables.remotes);
    space.setTable(SpaceTables.UserPreference, tables.user_preference);
    space.setPartialValues(values);
    await syncService.reinit(true);
  };
  const getContentToExport = async () => {
    // export remotes and & space values
    const remotes = space.getTable(SpaceTables.Remote);
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
