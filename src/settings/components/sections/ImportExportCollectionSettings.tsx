import { CollectionItemType } from '@/collection/collection';
import ExportItemsButton from '@/common/buttons/ExportItemsButton';
import GenericExportFileButton from '@/common/buttons/GenericExportFileButton';
import GenericImportFileButton from '@/common/buttons/GenericImportFileButton';
import platformService from '@/common/services/platform.service';
import { ANDROID_FOLDER } from '@/constants';
import storageService from '@/db/storage.service';
import {
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonList,
  IonText
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';

const ImportExportCollectionSettings = () => {
  const { t } = useLingui();

  const exportFileSuffix = `${platformService.getPlatform()}-backup`;
  const getExportFileName = () =>
    `${new Date().toISOString().substring(0, 19).replaceAll(/[:T]/g, '-')}-${exportFileSuffix}.json`;

  const onRestoreContent = async (content: string) => {
    const json = JSON.parse(content);
    storageService.getSpace().setContent(json);
  };

  const getContentToExport = async () => {
    return storageService.getSpace().getJson();
  };

  const onImportContentRead = async (content: string) => {
    await onRestoreContent(content);
    return true;
  };

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Import & export your collection</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>
            Manually backup or restore your collection in the format of your
            choice
          </Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <IonList>
          <IonItem>
            <Trans>Kiwimeri format (single file)</Trans>
            <IonButtons slot="end">
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
          </IonItem>
          <IonItem>
            <Trans>Markdown (Kiwimeri flavor)</Trans>
            <IonButtons slot={'end'}>
              <ExportItemsButton
                id={'space'}
                type={CollectionItemType.folder}
                label={t`Export`}
                icon={null}
                color={'primary'}
              />
            </IonButtons>
          </IonItem>
        </IonList>
        {platformService.isAndroid() && (
          <IonText color={'secondary'}>
            <p>
              <Trans>
                Your backups will be exported to the `{ANDROID_FOLDER}`
                directory
              </Trans>
            </p>
          </IonText>
        )}
      </IonCardContent>
    </IonCard>
  );
};
export default ImportExportCollectionSettings;
