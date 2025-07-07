import GenericExportFileButton from '@/common/buttons/GenericExportFileButton';
import GenericImportFileButton from '@/common/buttons/GenericImportFileButton';
import platformService from '@/common/services/platform.service';
import { ANDROID_FOLDER } from '@/constants';
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

type ImportExportSettingsProps = {
  title: string;
  subtitle: string;
  description?: string;
  onRestoreContent: (content: string) => Promise<void>;
  getContentToExport: () => string;
  exportFileSuffix: string;
};

const ImportExportSettings = ({
  title,
  subtitle,
  description,
  onRestoreContent,
  getContentToExport,
  exportFileSuffix
}: ImportExportSettingsProps) => {
  const { t } = useLingui();

  const getExportFileName = () =>
    `${new Date().toISOString().substring(0, 19).replaceAll(/[:T]/g, '-')}-${exportFileSuffix}.json`;

  const onImportContentRead = async (content: string) => {
    await onRestoreContent(content);
  };

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>{title}</IonCardTitle>
        <IonCardSubtitle>{subtitle}</IonCardSubtitle>
      </IonCardHeader>
      {(description || platformService.isAndroid()) && (
        <IonCardContent>
          {description}
          {platformService.isAndroid() && (
            <IonText color={'secondary'}>
              {description && <p>&nbsp;</p>}
              <p>
                <Trans>
                  Your backups will be exported to the `{ANDROID_FOLDER}`
                  directory
                </Trans>
              </p>
            </IonText>
          )}
        </IonCardContent>
      )}

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
          onContentRead={onImportContentRead}
        />
      </IonButtons>
    </IonCard>
  );
};
export default ImportExportSettings;
