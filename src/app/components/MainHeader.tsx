import {
  InputCustomEvent,
  IonButton,
  IonButtons,
  IonIcon,
  IonInput,
  IonMenuButton,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { ReactNode } from 'react';
import { APPICONS } from '../../constants';
import storageService from '../../db/storage.service';
import { syncConfService } from '../../db/sync-configurations.service';

export type MainHeaderProps = {
  title: string;
  editable?: boolean;
  onEdited?: (textEdited: string) => void;
} & { readonly children?: ReactNode };

const MainHeader = ({
  title,
  editable = false,
  onEdited,
  children
}: MainHeaderProps) => {
  return (
    <IonToolbar>
      <IonButtons slot="start">
        <IonMenuButton></IonMenuButton>
      </IonButtons>
      {!editable && <IonTitle>{title}</IonTitle>}
      {editable && (
        <IonInput
          class="invisible"
          value={title}
          onIonChange={(e: InputCustomEvent) => {
            if (onEdited && typeof e.detail.value === 'string') {
              onEdited(e.detail.value || '');
            }
          }}
        ></IonInput>
      )}

      <IonButtons slot="end">
        <IonButton
          disabled={!syncConfService.useCurrentTestStatus()}
          onClick={async () => await storageService.push()}
        >
          <IonIcon icon={APPICONS.cloudUpload}></IonIcon>
        </IonButton>
        <IonButton
          disabled={!syncConfService.useCurrentTestStatus()}
          onClick={async () => await storageService.pull()}
        >
          <IonIcon icon={APPICONS.cloudDownload}></IonIcon>
        </IonButton>
        {children}
      </IonButtons>
    </IonToolbar>
  );
};

export default MainHeader;
