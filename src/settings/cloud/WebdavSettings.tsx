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
import platformService from '../../common/services/platform.service';
import { appConfig } from '../../config';

const WebdavSettings = () => {
  const [init, setInit] = useState(false);
  const [connectionOK, setConnectionOK] = useState(false);

  useEffect(() => {
    const webdavInit = async () => {
      console.debug('init', init);
      if (!init) {
        setInit(true);
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
          await webdavClient.pull();
          setConnectionOK(true);
        } catch (e) {
          console.error('error', e);
        }
      }
    };
    webdavInit();
  }, [init]);

  return (
    <IonCard className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Webdav</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>Synchronize your collection with a WebDAV server</Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        {'connection is '}
        <IonIcon icon={connectionOK ? checkmarkOutline : bugOutline}></IonIcon>
      </IonCardContent>
    </IonCard>
  );
};
export default WebdavSettings;
