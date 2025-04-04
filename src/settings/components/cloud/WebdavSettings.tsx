import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { webdavClient } from '@repo/kiwimeri-sync-webdav';
import { bugOutline, checkmarkOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import platformService from '../../../common/services/platform.service';
import { appConfig } from '../../../config';

const WebdavSettings = () => {
  const [connectionOK, setConnectionOK] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    const webdavInit = async () => {
      let serverUrl = import.meta.env['VITE_WEBDAV_SERVER_URL'];
      if (platformService.is(['web', 'electron']) && appConfig.HTTP_PROXY) {
        serverUrl = `${appConfig.HTTP_PROXY}/${serverUrl}`;
      }
      webdavClient.configure({
        serverUrl,
        username: import.meta.env['VITE_WEBDAV_USERNAME'],
        password: import.meta.env['VITE_WEBDAV_PASSWORD'],
        path: import.meta.env['VITE_WEBDAV_PATH']
      });
      webdavClient.init();
      try {
        const res = await webdavClient.pull();
        setResult(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (res as any).map((r: { filename: string }) => r.filename).join(' ')
        );
        setConnectionOK(true);
      } catch (e) {
        console.error('error', e);
      }
    };
    webdavInit();
  }, []);

  return (
    <IonCard className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>WebDAV</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>Synchronize your collection with a WebDAV server</Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        {'connection is '}
        <IonIcon icon={connectionOK ? checkmarkOutline : bugOutline}></IonIcon>
        {result}
      </IonCardContent>
    </IonCard>
  );
};
export default WebdavSettings;
