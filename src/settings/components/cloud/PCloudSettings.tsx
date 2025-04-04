import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { pcloudClient } from '@repo/kiwimeri-sync-pcloud';
import { bugOutline, checkmarkOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import platformService from '../../../common/services/platform.service';
import { appConfig } from '../../../config';

const PCloudSettings = () => {
  const [connectionOK, setConnectionOK] = useState(false);

  useEffect(() => {
    const init = async () => {
      let serverUrl = import.meta.env['VITE_PCLOUD_API'];
      if (platformService.is(['web', 'electron']) && appConfig.HTTP_PROXY) {
        serverUrl = `${appConfig.HTTP_PROXY}/${serverUrl}`;
      }
      pcloudClient.configure({
        serverUrl,
        username: import.meta.env['VITE_PCLOUD_USERNAME'],
        password: import.meta.env['VITE_PCLOUD_PASSWORD'],
        folderId: import.meta.env['VITE_PCLOUD_FOLDER_ID']
      });
      setConnectionOK(await pcloudClient.test());
    };
    init();
  }, []);

  return (
    <IonCard className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>PCloud</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>Synchronize your collection with your PCloud account</Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        {'connection is '}
        <IonIcon icon={connectionOK ? checkmarkOutline : bugOutline}></IonIcon>
      </IonCardContent>
    </IonCard>
  );
};
export default PCloudSettings;
