import { CollectionItemResult } from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import {
  IonButton,
  IonButtons,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import React, { useState } from 'react';

export type ConfirmFileImportModalProps = {
  folder: string;
  duplicates: CollectionItemResult[];
  onClose: (confirm: boolean, item?: CollectionItemResult) => void;
} & React.HTMLAttributes<HTMLIonModalElement>;

const ConfirmFileImportModal = ({
  folder,
  duplicates,
  onClose
}: ConfirmFileImportModalProps) => {
  const [item, setItem] = useState<CollectionItemResult | undefined>(undefined);

  const folderName =
    collectionService.getItemTitle(folder) || getGlobalTrans().homeTitle;

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <Trans>Import file in folder {folderName}</Trans>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => onClose(false)}>
              <IonIcon icon={APPICONS.closeAction} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonLabel style={{ padding: 10 }} color={'secondary'}>
        <Trans>
          The following file(s) with matching title(s) have been detected inside
          the folder. Select one to overwrite with the import. Leave unselected
          to create a new document.
        </Trans>
      </IonLabel>
      <IonList style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <IonRadioGroup
          allowEmptySelection={true}
          onIonChange={event => setItem(event.detail.value)}
        >
          {duplicates?.map(item => (
            <IonItem key={item.id}>
              <IonRadio value={item}>
                {item.title}
                <IonLabel color={'medium'}>{item.preview}</IonLabel>
              </IonRadio>
            </IonItem>
          ))}
        </IonRadioGroup>
      </IonList>
      <IonFooter>
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton onClick={() => onClose(false)}>
              <Trans>Cancel</Trans>
            </IonButton>
            <IonButton onClick={() => onClose(true, item)}>
              <Trans>Confirm</Trans>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};
export default ConfirmFileImportModal;
