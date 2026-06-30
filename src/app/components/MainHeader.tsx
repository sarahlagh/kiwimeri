import SyncRemoteButton from '@/common/buttons/SyncRemoteButton';
import collectionService from '@/db/collection.service';
import { conflictsService } from '@/domain/conflicts/conflicts-service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import fetchRemotesQuery from '@/domain/replication/replica-state/queries/fetchRemotesQuery';
import { resumeService } from '@/domain/resume-state/resume-state.service';
import { DeepSearchButton } from '@/features/search';
import { useSynchronizationStates } from '@/features/synchronization-ui';
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
  const {
    isPrimaryConnected,
    hasChanges,
    hasRemoteChanges,
    hasConflicts,
    isSyncEnabled
  } = useSynchronizationStates();
  const enabled = !isSyncing && isSyncEnabled;
  const { setToast } = useToastContext();

  useEffect(() => {
    conflictsService.initConflictQueries();
    fetchRemotesQuery.initQuery();
  }, []);

  function getColor() {
    if (!isPrimaryConnected) return undefined;
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
    const currentFolder = resumeService.getCurrentFolder();
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
        {deviceSettings.isSyncEnabled() && (
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
