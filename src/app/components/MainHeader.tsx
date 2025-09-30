import SyncRemoteButton from '@/common/buttons/SyncRemoteButton';
import platformService from '@/common/services/platform.service';
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
  const hasRemoteChanges = syncService.usePrimaryHasRemoteChanges();
  const hasConflicts = syncService.useHasLocalConflicts();
  const pushEnabled = !isSyncing && isInit && hasChanges;

  function getColor() {
    if (isSyncing) return 'warning';
    if (pushEnabled) return 'danger';
    if (hasRemoteChanges) return 'tertiary';
    return undefined;
  }

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
        {platformService.isSyncEnabled() && (
          <SyncRemoteButton
            disabled={!isInit}
            direction="sync"
            color={getColor()}
            showConflictsWarning={hasConflicts}
            showRemoteChangesWarning={hasRemoteChanges}
            onSyncStart={() => setIsSyncing(true)}
            onSyncEnd={() => setIsSyncing(false)}
          />
        )}
        {children}
      </IonButtons>
    </IonToolbar>
  );
};

export default MainHeader;
