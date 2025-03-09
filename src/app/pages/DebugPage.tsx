import { Capacitor } from '@capacitor/core';
import {
  getPlatforms,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import platformService from '../../common/services/platform.service';
import { appConfig } from '../../config';
import storageService from '../../db/storage.service';
import MainHeader from '../components/MainHeader';

const DebugPage = () => {
  const { t } = useLingui();
  const onClear: React.MouseEventHandler<HTMLIonButtonElement> = () => {
    storageService.getStore().setContent([{}, {}]);
  };
  return (
    <IonPage>
      <IonHeader>
        <MainHeader title={t`Debug`}></MainHeader>
      </IonHeader>
      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <Trans>Platform(s)</Trans>
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>(capacitor) platform: {platformService.getPlatform()}</p>
            <p>(ionic) platforms: {JSON.stringify(getPlatforms())}</p>
            <p>is dev: {platformService.isDev() ? 'yes' : 'no'}</p>
            <p>is android: {platformService.isAndroid() ? 'yes' : 'no'}</p>
            <p>is web: {platformService.isWeb() ? 'yes' : 'no'}</p>
            <p>config: {JSON.stringify(appConfig)}</p>
            <p>capacitor debug: {Capacitor.DEBUG}</p>
          </IonCardContent>
        </IonCard>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <Trans>Operations</Trans>
            </IonCardTitle>
          </IonCardHeader>

          <IonCardContent>
            <IonButton fill="clear" onClick={onClear} color="danger">
              nuke db
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};
export default DebugPage;
