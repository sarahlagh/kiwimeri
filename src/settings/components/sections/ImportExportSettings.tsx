import GenericImportFileButton from '@/common/buttons/GenericImportFileButton';
import { useToastContext } from '@/common/context/ToastContext';
import filesystemService from '@/common/services/filesystem.service';
import platformService from '@/common/services/platform.service';
import { ANDROID_FOLDER } from '@/constants';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonText
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import React from 'react';

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
  const { setToast } = useToastContext();

  // export
  const onExport: React.MouseEventHandler<HTMLIonButtonElement> = () => {
    const content = getContentToExport();
    const fileName = `${new Date().toISOString().substring(0, 19).replaceAll(/[:T]/g, '-')}-${exportFileSuffix}.json`;

    filesystemService.exportToFile(fileName, content).then(() => {
      if (platformService.isAndroid()) {
        setToast(t`Success!`, 'success');
      }
    });
  };

  const onContentRead = async (content: string) => {
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
        <IonButton fill="clear" color={'primary'} onClick={onExport}>
          <Trans>Export</Trans>
        </IonButton>
        <GenericImportFileButton
          fill="clear"
          color="danger"
          icon={null}
          label={t`Restore`}
          onContentRead={onContentRead}
        />
      </IonButtons>
    </IonCard>
  );
};
export default ImportExportSettings;
