import platformService from '@/common/services/platform.service';
import remotesService from '@/db/remotes.service';
import { PCloudConf } from '@/storage-providers/pcloud/pcloud';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonList,
  IonReorder,
  IonReorderGroup,
  IonToggle,
  ItemReorderEventDetail
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import PCloudSettings from './PCloudSettings';

const RemotesSettings = () => {
  const [reorderEnabled, setReorderEnabled] = useState(false);
  const remotes = remotesService.useRemotes();

  const addRemote = () => {
    // TODO: later add the possibility to choose which type
    remotesService.addRemote('pcloud', remotes.length, 'pcloud', {
      serverLocation: 'eu'
    } as PCloudConf);
  };

  function handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    remotesService.updateRemoteRank(event.detail.from, event.detail.to);
    event.detail.complete();
  }

  return (
    <IonCard className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Remote Configuration</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>Configure where to synchronize your collection</Trans>
        </IonCardSubtitle>
      </IonCardHeader>
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
                      />
                    </IonItem>
                  </IonReorder>
                );
              })}
            </IonReorderGroup>
          </IonList>
        )}
      </IonCardContent>
      <IonButton fill="clear" onClick={addRemote}>
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
    </IonCard>
  );
};
export default RemotesSettings;
