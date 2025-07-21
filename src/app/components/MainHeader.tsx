import SyncRemoteButton from '@/common/buttons/SyncRemoteButton';
import platformService from '@/common/services/platform.service';
import notebooksService from '@/db/notebooks.service';
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
  const pushColor = isSyncing ? 'warning' : !pushEnabled ? undefined : 'danger';

  const notebook = notebooksService.useCurrentNotebook();
  const notebookTitle = notebooksService.useNotebookTitle(notebook);

  return (
    <IonToolbar>
      <IonButtons slot="start">
        <IonMenuButton></IonMenuButton>
      </IonButtons>
      {!editable && (
        <IonTitle>
          ({notebookTitle}) {title}
        </IonTitle>
      )}
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
            color={pushColor}
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
