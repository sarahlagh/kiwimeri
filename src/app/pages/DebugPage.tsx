import NotFound from '@/app/components/NotFound';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { appLog } from '@/log';
import {
  getPlatforms,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import TemplateMainPage from './TemplateMainPage';

const DebugPage = () => {
  const { t } = useLingui();
  if (platformService.isRelease()) {
    return <NotFound />;
  }
  return (
    <TemplateMainPage title={t`Debug`}>
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
            <p>is electron: {platformService.isElectron() ? 'yes' : 'no'}</p>
            <p>is wide: {platformService.isWideEnough() ? 'yes' : 'no'}</p>
            <p>config: {JSON.stringify(appConfig)}</p>
          </IonCardContent>
        </IonCard>
        {platformService.isAndroid() && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <Trans>Logs</Trans>
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {appLog.getLogs().map(log => {
                return (
                  <p key={log.key}>
                    {new Date(log.ts).toLocaleTimeString()} {log.level} &nbsp;
                    {JSON.stringify(log.message)} &nbsp;
                    {log.optionalParams && JSON.stringify(log.optionalParams)}
                  </p>
                );
              })}
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </TemplateMainPage>
  );
};
export default DebugPage;
