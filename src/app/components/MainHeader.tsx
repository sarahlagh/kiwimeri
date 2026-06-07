import DeepSearchButton from '@/common/buttons/DeepSearchButton';
import SyncRemoteButton from '@/common/buttons/SyncRemoteButton';
import { plt } from '@/core/infra/platform';
import collectionService from '@/db/collection.service';
import navService from '@/db/nav.service';
import { conflictsService } from '@/domain/conflicts/conflicts-service';
import { syncService } from '@/remote-storage/sync.service';
import {
  InputCustomEvent,
  IonButtons,
  IonInput,
  IonMenuButton,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { useLingui } from '@lingui/react/macro';
import { ReactNode, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useToastContext } from '../context/ToastContext';

export type MainHeaderProps = {
  title: string;
  editable?: boolean;
  onEdited?: (textEdited: string) => void;
} & IonicReactProps &
  React.HTMLAttributes<HTMLIonHeaderElement> & {
    readonly children?: ReactNode;
  };

const MainHeader = ({
  title,
  editable = false,
  onEdited,
  children,
  color
}: MainHeaderProps) => {
  const { t } = useLingui();
  const history = useHistory();
  const location = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);
  const isMergeSyncEnabled = syncService.useIsMergeSyncEnabled();
  const hasChanges = syncService.usePrimaryHasLocalChanges();
  const hasRemoteChanges = syncService.usePrimaryHasRemoteChanges();
  const hasConflicts = conflictsService.useHasLocalConflicts();
  const enabled = !isSyncing && isMergeSyncEnabled;
  const { setToast } = useToastContext();

  useEffect(() => {
    conflictsService.initConflictQueries();
  }, []);

  function getColor() {
    if (isSyncing) return 'warning';
    if (hasChanges || hasConflicts) return 'danger';
    if (hasRemoteChanges) return 'tertiary';
    return undefined;
  }

  function onSyncEnd(resp: { success: boolean }) {
    if (resp?.success === false) {
      setToast(t`An error occurred during sync.`, 'danger');
    }
    setIsSyncing(false);
    const currentFolder = navService.getCurrentFolder();
    if (!collectionService.itemExists(currentFolder)) {
      console.debug('current folder deleted', currentFolder);
      // soft refresh, InitialRoutingProvider will do the rest
      history.replace(location);
    }
  }

  return (
    <IonToolbar color={color}>
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
        <DeepSearchButton />
        {plt.isSyncEnabled() && (
          <SyncRemoteButton
            disabled={!enabled}
            direction="sync"
            color={getColor()}
            showConflictsWarning={hasConflicts}
            showRemoteChangesWarning={hasRemoteChanges}
            onSyncStart={() => setIsSyncing(true)}
            onSyncEnd={onSyncEnd}
          />
        )}
        {children}
      </IonButtons>
    </IonToolbar>
  );
};

export default MainHeader;
