import { remotesService } from '@/db/remotes.service';
import { PCloudConf } from '@/storage-providers/pcloud/pcloud';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonList
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import PCloudSettings from './PCloudSettings';

const RemotesSettings = () => {
  const remotes = remotesService.useRemotes();
  console.debug('found remotes', remotes);

  const addRemote = () => {
    // TODO: later add the possibility to choose which type
    remotesService.addRemote('pcloud', remotes.length, 'pcloud', {
      serverLocation: 'eu'
    } as PCloudConf);
  };

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
          <IonList>
            {remotes.map(remote => {
              return (
                <IonItem key={remote.id}>
                  {/* TODO: switch by type */}
                  <PCloudSettings remote={remote} />
                </IonItem>
              );
            })}
          </IonList>
        )}
      </IonCardContent>
      <IonButton fill="clear" onClick={addRemote}>
        <Trans>Add config</Trans>
      </IonButton>
    </IonCard>
  );
};
export default RemotesSettings;
