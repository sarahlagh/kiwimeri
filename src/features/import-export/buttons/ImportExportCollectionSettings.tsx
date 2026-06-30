import GenericExportFileButton from '@/common_to_migrate/buttons/GenericExportFileButton';
import { dateToStr } from '@/common_to_migrate/date-utils';
import { space } from '@/core/db/store';
import { plt } from '@/core/infra/platform';
import { CollectionItemType } from '@/domain/collection/collection';
import {
  ExportItemsButton,
  RestoreCollectionButton
} from '@/features/import-export';
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

  const exportFileSuffix = `${plt.getPlatform()}-backup`;
  const getExportFileName = (full = false) =>
    `${dateToStr('iso')}-${exportFileSuffix}${full ? '-full' : ''}.json`;

  const getContentToExport = async () => {
    const content = space.getContent();
    return JSON.stringify([
      {
        collection: content[0].collection,
        document_annotation: content[0].document_annotation
      }
    ]);
  };

  const getContentWithHistoryToExport = async () => {
    const content = space.getContent();
    return JSON.stringify([
      {
        collection: content[0].collection,
        document_annotation: content[0].document_annotation,
        history: content[0].history,
        history_content: content[0].history_content,
        stats: content[0].stats
      }
    ]);
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
            <Trans>Kiwimeri format (with history & stats)</Trans>
            <IonButtons slot="end">
              <GenericExportFileButton
                fill="clear"
                color={'primary'}
                label={t`Export`}
                icon={null}
                getFileMime={'application/json'}
                getFileTitle={() => getExportFileName(true)}
                getFileContent={getContentWithHistoryToExport}
              />
            </IonButtons>
          </IonItem>
          <IonItem>
            <Trans>Kiwimeri format (content only)</Trans>
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
