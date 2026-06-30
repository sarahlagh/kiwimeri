import platformService from '@/common_to_migrate/services/platform.service';
import { APPICONS } from '@/constants';
import { useQueryResults } from '@/core/db/queries-helper';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import remotesService from '@/domain/synchronization/configuration/remotes.service';
import { PCloudConf } from '@/domain/synchronization/drivers/pcloud/pcloud.driver';
import fetchRemotesQuery from '@/domain/synchronization/replica-state/queries/fetchRemotesQuery';
import { syncService } from '@/domain/synchronization/sync.service';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonList,
  IonReorder,
  IonReorderGroup,
  IonToggle,
  ItemReorderEventDetail
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import PCloudSettings from './providers/PCloudSettings';

const RemotesSettings = () => {
  const [reorderEnabled, setReorderEnabled] = useState(false);
  const remotes = useQueryResults(fetchRemotesQuery);

  const addRemote = () => {
    // TODO: later add the possibility to choose which type
    remotesService.addRemote('pcloud', remotes.length, 'pcloud', {
      serverLocation: 'eu'
    } as PCloudConf);
  };

  const onConfigured = async (ok: boolean) => {
    if (ok) {
      await syncService.reinit();
    }
  };

  function handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    remotesService.updateRemoteRank(event.detail.from, event.detail.to);
    event.detail.complete();
  }

  const syncEnabled = deviceSettings.isSyncEnabled();

  return (
    <IonCard className="primary" disabled={!syncEnabled}>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Remote Configuration</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>Configure where to synchronize your collection</Trans>
          {!syncEnabled && (
            <p>
              <IonItem color={'warning'}>
                <IonIcon icon={APPICONS.warning}></IonIcon>
                <Trans>Syncing is disabled on the web version.</Trans>
              </IonItem>
            </p>
          )}
        </IonCardSubtitle>
      </IonCardHeader>
      {syncEnabled && (
        <IonCardContent>
          {remotes.length === 0 && (
            <Trans>You have not configured any remote yet.</Trans>
          )}
          {remotes.length > 0 && (
            <IonList class="wrapper-list">
              <IonReorderGroup
                disabled={!reorderEnabled || platformService.isAndroid()}
                onIonItemReorder={handleReorder}
              >
                {remotes.map(remote => {
                  return (
                    <IonReorder key={remote.id}>
                      <IonItem>
                        {/* TODO: switch by type */}
                        <PCloudSettings
                          remote={remote}
                          isPrimary={remote.rank === 0}
                          isLast={remote.rank === remotes.length - 1}
                          reorderEnabled={reorderEnabled}
                          onConfigured={onConfigured}
                        />
                      </IonItem>
                    </IonReorder>
                  );
                })}
              </IonReorderGroup>
            </IonList>
          )}
        </IonCardContent>
      )}
      <IonButtons>
        <IonButton fill="clear" color={'primary'} onClick={addRemote}>
          <Trans>Add config</Trans>
        </IonButton>
        {remotes.length > 1 && (
          <IonButton
            fill="clear"
            onClick={() => setReorderEnabled(!reorderEnabled)}
          >
            <IonToggle checked={reorderEnabled}>
              <Trans>Reorder</Trans>
            </IonToggle>
          </IonButton>
        )}
      </IonButtons>
    </IonCard>
  );
};
export default RemotesSettings;
