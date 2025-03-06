import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonToast
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import React, { useState } from 'react';
import storageService from '../../db/storage.service';

const ImportExportCollectionSettings = () => {
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useState(false);
  const errorMessage = t`An error occurred loading the file`;
  const successMessage = t`Success!`;

  const exportElement = React.useRef(null);
  const restoreElement = React.useRef(null);
  const toast = React.useRef(null);

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
    function setToast(msg: string, color: string) {
      if (toast.current) {
        const current = toast.current as HTMLIonToastElement;
        current.message = msg;
        current.color = color;
        setIsOpen(true);
      }
    }
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.addEventListener(
        'load',
        () => {
          const json = reader.result as string;
          try {
            const content = JSON.parse(json);
            storageService.getStore().setContent(content);

            setToast(successMessage, 'success');
          } catch (e) {
            console.error(e);
            setToast(errorMessage, 'warning');
          }
        },
        false
      );
      reader.readAsText(file);
    }
  };

  // export
  const onExport: React.MouseEventHandler<HTMLIonButtonElement> = () => {
    if (exportElement.current) {
      const content = storageService.getStore().getJson();
      const blob = new Blob([content], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const current = exportElement.current as HTMLLinkElement;
      current.href = url;
      current.click();
    }
  };

  const dateStr = new Date().toISOString().substring(0, 10);
  const exportFileName = `${dateStr}-backup.json`;

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Import & export your collection</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>Manually backup or restore your collection</Trans>
        </IonCardSubtitle>
      </IonCardHeader>
      <IonButton fill="clear" onClick={onExport}>
        <Trans>Export</Trans>
        <a
          ref={exportElement}
          download={exportFileName}
          className="ion-hide"
        ></a>
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
export default ImportExportCollectionSettings;
