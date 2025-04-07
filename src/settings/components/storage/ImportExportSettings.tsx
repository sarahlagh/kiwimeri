import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonToast
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import React, { useState } from 'react';
import filesystemService from '../../../common/services/filesystem.service';
import platformService from '../../../common/services/platform.service';

type ImportExportSettingsProps = {
  title: string;
  description: string;
  onRestoreContent: (content: string) => void;
  getContentToExport: () => string;
  androidFolder: string;
  exportFileSuffix: string;
};

const ImportExportSettings = ({
  title,
  description,
  onRestoreContent,
  getContentToExport,
  androidFolder,
  exportFileSuffix
}: ImportExportSettingsProps) => {
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useState(false);
  const errorMessage = t`An error occurred loading the file`;
  const successMessage = t`Success!`;

  const restoreElement = React.useRef(null);
  const toast = React.useRef(null);

  function setToast(msg: string, color: string) {
    if (toast.current) {
      const current = toast.current as HTMLIonToastElement;
      current.message = msg;
      current.color = color;
      setIsOpen(true);
    }
  }

  // open the file picker
  const onRestore: React.MouseEventHandler<HTMLIonButtonElement> = () => {
    if (restoreElement.current) {
      const current = restoreElement.current as HTMLInputElement;
      current.click();
    }
  };
  // read the selected file
  const onRestoreFileChange: React.ChangeEventHandler<
    HTMLInputElement
  > = event => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      filesystemService.readFile(file).then(content => {
        try {
          onRestoreContent(content);

          setToast(successMessage, 'success');
        } catch (e) {
          console.error(e);
          setToast(errorMessage, 'warning');
        }
      });
    }
  };

  // export
  const onExport: React.MouseEventHandler<HTMLIonButtonElement> = () => {
    const content = getContentToExport();
    const fileName = `${new Date().toISOString().substring(0, 19).replaceAll(/[:T]/g, '-')}-${exportFileSuffix}.json`;

    filesystemService
      .exportToFile(fileName, content, `${androidFolder}/`)
      .then(() => {
        if (platformService.isAndroid()) {
          setToast(t`Success!`, 'success');
        }
      });
  };

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>{title}</IonCardTitle>
        <IonCardSubtitle>{description}</IonCardSubtitle>
      </IonCardHeader>

      {platformService.isAndroid() && (
        <IonCardContent>
          <Trans>
            Your backups will be exported to the `{androidFolder}` directory
          </Trans>
        </IonCardContent>
      )}

      <IonButton fill="clear" onClick={onExport}>
        <Trans>Export</Trans>
      </IonButton>
      <IonButton fill="clear" onClick={onRestore} color="danger">
        <Trans>Restore</Trans>
        <input
          ref={restoreElement}
          onChange={onRestoreFileChange}
          type="file"
          className="ion-hide"
        />
      </IonButton>
      <IonToast
        ref={toast}
        isOpen={isOpen}
        onDidDismiss={() => setIsOpen(false)}
        duration={3000}
        swipeGesture="vertical"
        buttons={[
          {
            text: 'Dismiss',
            role: 'cancel'
          }
        ]}
      ></IonToast>
    </IonCard>
  );
};
export default ImportExportSettings;
