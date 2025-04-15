import DeleteButton from '@/common/buttons/DeleteButton';
import platformService from '@/common/services/platform.service';
import { APPICONS } from '@/constants';
import { remotesService } from '@/db/remotes.service';
import { RemoteResult } from '@/db/store-types';
import {
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ReactNode } from 'react';

type RemoteGenericSettingsProps = {
  title: string;
  checking: boolean;
  remote: RemoteResult;
} & { readonly children?: ReactNode };

const RemoteGenericSettings = ({
  title,
  checking,
  remote,
  children
}: RemoteGenericSettingsProps) => {
  const { t } = useLingui();
  const syncStatus = remote.connected;

  const onNameChange = (value: string) => {
    remotesService.setRemoteName(remote.id, value);
  };
  const deleteRemote = () => {
    // TODO add confirmation
    remotesService.delRemote(remote.id);
  };

  const labelPlacement = platformService.isWideEnough() ? undefined : 'stacked';

  return (
    <IonList className="inner-list">
      <IonListHeader>
        <IonLabel>{title}</IonLabel>
        <DeleteButton
          trigger={'delete-remote-' + remote.id}
          onConfirm={deleteRemote}
        ></DeleteButton>
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
