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

const PCloudSettings = () => {
  const [connectionOK, setConnectionOK] = useState(false);

  useEffect(() => {
    const init = async () => {
      setConnectionOK(
        await pcloudClient.test().catch(() => {
          return false;
        })
      );
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
