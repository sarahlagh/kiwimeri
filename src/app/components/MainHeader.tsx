import SyncRemoteButton from '@/common/buttons/SyncRemoteButton';
import { syncService } from '@/remote-storage/sync.service';
import {
  InputCustomEvent,
  IonButtons,
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
  const isInit = syncService.usePrimaryConnected();
  const hasChanges = syncService.usePrimaryHasLocalChanges();
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
        <SyncRemoteButton
          direction="push"
          disabled={!pushEnabled}
          color={pushColor}
          onSyncStart={() => setIsSyncing(true)}
          onSyncEnd={() => setIsSyncing(false)}
        />
        <SyncRemoteButton
          direction="pull"
          disabled={!pullEnabled}
          color={pullColor}
          onSyncStart={() => setIsSyncing(true)}
          onSyncEnd={() => setIsSyncing(false)}
        />
        {children}
      </IonButtons>
    </IonToolbar>
  );
};

export default MainHeader;
