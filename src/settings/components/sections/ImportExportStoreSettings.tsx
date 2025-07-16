import GenericExportFileButton from '@/common/buttons/GenericExportFileButton';
import GenericImportFileButton from '@/common/buttons/GenericImportFileButton';
import platformService from '@/common/services/platform.service';
import { ANDROID_FOLDER } from '@/constants';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import {
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonText
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';

const ImportExportCollectionSettings = () => {
  const { t } = useLingui();

  const getExportFileName = () =>
    `${new Date().toISOString().substring(0, 19).replaceAll(/[:T]/g, '-')}-${exportFileSuffix}.json`;

  const exportFileSuffix = 'app-settings';
  const onRestoreContent = async (content: string) => {
    const json = JSON.parse(content);
    storageService.getStore().setContent(json);
    await remotesService.initSyncConnection(storageService.getSpaceId(), true);
  };
  const getContentToExport = async () => {
    const content = storageService.getStore().getContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [contentToExport, valuesToExport]: [any, any] = content;
    delete contentToExport['spaces'];
    delete contentToExport['localChanges'];
    delete contentToExport['remoteState'];
    delete contentToExport['remoteItems'];
    delete valuesToExport['currentSpace'];
    return JSON.stringify([contentToExport, valuesToExport]);
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
          anything configured in this page, including the settings for your
          cloud provider.
        </Trans>
        {platformService.isAndroid() && (
          <IonText color={'secondary'}>
            <p>&nbsp;</p>
            <p>
              <Trans>
                Your backups will be exported to the `{ANDROID_FOLDER}`
                directory
              </Trans>
            </p>
          </IonText>
        )}
      </IonCardContent>

      <IonButtons>
        <GenericExportFileButton
          fill="clear"
          color={'primary'}
          label={t`Export`}
          icon={null}
          fileMime={'application/json'}
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
export default ImportExportCollectionSettings;
