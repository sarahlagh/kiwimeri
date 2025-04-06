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
import storageService from '../../../db/storage.service';

const PCloudSettings = () => {
  const [connectionOK, setConnectionOK] = useState(false);

  useEffect(() => {
    const init = async () => {
      let proxy = undefined;
      if (platformService.is(['web', 'electron']) && appConfig.HTTP_PROXY) {
        proxy = appConfig.HTTP_PROXY;
      }
      pcloudClient.configure({
        proxy,
        serverUrl: import.meta.env['VITE_PCLOUD_API'],
        username: import.meta.env['VITE_PCLOUD_USERNAME'],
        password: import.meta.env['VITE_PCLOUD_PASSWORD'],
        path: import.meta.env['VITE_PCLOUD_FOLDER_PATH']
      });
      const ok = await pcloudClient.test();
      setConnectionOK(ok);
      if (ok) {
        await pcloudClient.init(storageService.getCurrentSpace());
      }
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
