import { GET_FOLDER_ROUTE } from '@/common/routes';
import notebooksService from '@/db/notebooks.service';
import userSettingsService from '@/db/user-settings.service';
import { IonCard, IonCardContent, IonToggle } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { useHistory } from 'react-router';

const DevTools = () => {
  const history = useHistory();

  return (
    <>
      <IonCard>
        <IonCardContent>
          <IonToggle
            checked={true}
            onIonChange={() => {
              userSettingsService.setShowDevTools(false);
              history.replace(
                GET_FOLDER_ROUTE(notebooksService.getCurrentNotebook())
              );
            }}
          >
            <Trans>Dev Tools Enabled</Trans>
          </IonToggle>
        </IonCardContent>
      </IonCard>
    </>
  );
};
export default DevTools;
