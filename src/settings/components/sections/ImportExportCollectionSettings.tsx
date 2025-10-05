import { CollectionItemType } from '@/collection/collection';
import ExportItemsButton from '@/common/buttons/ExportItemsButton';
import GenericExportFileButton from '@/common/buttons/GenericExportFileButton';
import RestoreCollectionButton from '@/common/buttons/RestoreCollectionButton';
import platformService from '@/common/services/platform.service';
import { dateToStr } from '@/common/utils';
import storageService from '@/db/storage.service';
import {
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonList
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';

const ImportExportCollectionSettings = () => {
  const { t } = useLingui();

  const exportFileSuffix = `${platformService.getPlatform()}-backup`;
  const getExportFileName = () =>
    `${dateToStr('iso')}-${exportFileSuffix}.json`;

  const getContentToExport = async () => {
    return storageService.getSpace().getJson();
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
                getFileMime={'application/json'}
                getFileTitle={getExportFileName}
                getFileContent={getContentToExport}
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
      </IonCardContent>
      <IonButtons>
        <RestoreCollectionButton />
      </IonButtons>
    </IonCard>
  );
};
export default ImportExportCollectionSettings;
