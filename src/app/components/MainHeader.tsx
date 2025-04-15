import { APPICONS } from '@/constants';
import { remotesService } from '@/db/remotes.service';
import storageService from '@/db/storage.service';
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
import { ReactNode, useState } from 'react';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const isInit = remotesService.useCurrentConnectionStatus();
  const hasChanges = remotesService.useCurrentHasLocalChanges();
  const pushEnabled = !isSyncing && isInit && hasChanges;
  const pullEnabled = !isSyncing && isInit;
  const pushColor = isSyncing ? 'warning' : !pushEnabled ? undefined : 'danger';
  const pullColor = isSyncing ? 'warning' : undefined;

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
          disabled={!pushEnabled}
          onClick={async () => {
            setIsSyncing(true);
            await storageService.push();
            setIsSyncing(false);
          }}
        >
          <IonIcon color={pushColor} icon={APPICONS.cloudUpload}></IonIcon>
        </IonButton>
        <IonButton
          disabled={!pullEnabled}
          color={pullColor}
          onClick={async () => {
            setIsSyncing(true);
            await storageService.pull();
            setIsSyncing(false);
          }}
        >
          <IonIcon icon={APPICONS.cloudDownload}></IonIcon>
        </IonButton>
        {children}
      </IonButtons>
    </IonToolbar>
  );
};

export default MainHeader;
