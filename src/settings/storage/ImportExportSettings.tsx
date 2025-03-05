import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import React from 'react';
import storageService from '../../db/storage.service';

const ImportExportSettings = () => {
  const inputElement = React.useRef(null);
  const onImport: React.MouseEventHandler<HTMLIonButtonElement> = event => {
    console.log(event);
  };
  const onExport: React.MouseEventHandler<HTMLIonButtonElement> = () => {
    if (inputElement.current) {
      const content = storageService.getStore().getJson();
      const blob = new Blob([content], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const current = inputElement.current as HTMLLinkElement;
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
          <Trans>Import & Export</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>Manually backup or restore your collection</Trans>
        </IonCardSubtitle>
      </IonCardHeader>
      <IonButton fill="clear" onClick={onImport}>
        <Trans>Import</Trans>
      </IonButton>
      <IonButton fill="clear" onClick={onExport}>
        <Trans>Export</Trans>
        <a
          ref={inputElement}
          download={exportFileName}
          className="ion-hide"
        ></a>
      </IonButton>
    </IonCard>
  );
};
export default ImportExportSettings;
