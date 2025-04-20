import DeleteButton from '@/common/buttons/DeleteButton';
import SyncRemoteButton from '@/common/buttons/SyncRemoteButton';
import platformService from '@/common/services/platform.service';
import { APPICONS } from '@/constants';
import remotesService from '@/db/remotes.service';
import { RemoteResult } from '@/db/types/store-types';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ReactNode } from 'react';

export type RemoteGenericSettingsChildProps = {
  isPrimary: boolean;
  isLast: boolean;
  remote: RemoteResult;
  reorderEnabled?: boolean;
};

type RemoteGenericSettingsProps = {
  isPrimary: boolean;
  isLast: boolean;
  title: string;
  checking: boolean;
  remote: RemoteResult;
  reorderEnabled?: boolean;
} & { readonly children?: ReactNode };

const RemoteGenericSettings = ({
  isPrimary,
  isLast,
  title,
  checking,
  remote,
  reorderEnabled = true,
  children
}: RemoteGenericSettingsProps) => {
  const { t } = useLingui();
  const syncStatus = remote.connected;

  const onNameChange = (value: string) => {
    remotesService.setRemoteName(remote.id, value);
  };
  const deleteRemote = () => {
    remotesService.delRemote(remote.id);
  };

  const labelPlacement = platformService.isWideEnough() ? undefined : 'stacked';

  return (
    <IonList className="inner-list">
      <IonListHeader color={isPrimary ? 'primary' : 'medium'}>
        <IonLabel>{title}</IonLabel>
        {reorderEnabled && (!isPrimary || !isLast) && (
          <>
            <IonButton
              color="dark"
              disabled={isPrimary}
              onClick={() =>
                remotesService.updateRemoteRank(remote.rank, remote.rank - 1)
              }
            >
              <IonIcon icon={APPICONS.moveUp}></IonIcon>
            </IonButton>
            <IonButton
              color="dark"
              disabled={isLast}
              onClick={() =>
                remotesService.updateRemoteRank(remote.rank, remote.rank + 1)
              }
            >
              <IonIcon icon={APPICONS.moveDown}></IonIcon>
            </IonButton>
          </>
        )}
        {!reorderEnabled && (
          <>
            <SyncRemoteButton
              direction="push"
              remote={remote.id}
              color="light"
              askConfirm={true}
              disabled={!remote.connected}
            />
            <SyncRemoteButton
              direction="pull"
              remote={remote.id}
              color="light"
              askConfirm={true}
              disabled={!remote.connected}
            />
            <DeleteButton
              color="light"
              trigger={'delete-remote-' + remote.id}
              onConfirm={deleteRemote}
            ></DeleteButton>
          </>
        )}
      </IonListHeader>
      <IonItem>
        <IonLabel slot="start" className="ion-hide-md-down">
          <Trans>Name</Trans>
        </IonLabel>
        <IonInput
          label={labelPlacement ? t`Name` : undefined}
          labelPlacement={labelPlacement}
          onIonChange={e => onNameChange(e.detail.value || '')}
          value={remote.name}
        ></IonInput>
      </IonItem>
      {children}

      <IonItem lines="none" disabled={!syncStatus || checking}>
        {!checking && (
          <IonIcon
            slot="start"
            color={syncStatus ? 'success' : 'danger'}
            icon={syncStatus ? APPICONS.ok : APPICONS.ko}
          ></IonIcon>
        )}
      </IonItem>
    </IonList>
  );
};
export default RemoteGenericSettings;
