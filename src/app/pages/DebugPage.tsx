import NotFound from '@/app/components/NotFound';
import { CollectionItemType } from '@/collection/collection';
import DeleteButton from '@/common/buttons/DeleteButton';
import GenericExportFileButton from '@/common/buttons/GenericExportFileButton';
import {
  GET_DOCUMENT_ROUTE,
  GET_FOLDER_ROUTE,
  GET_PAGE_ROUTE
} from '@/common/routes';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { APPICONS, APPICONS_PER_TYPE } from '@/constants';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/local-changes.service';
import { appLog } from '@/log';
import {
  getPlatforms,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonItem,
  IonList,
  IonText
} from '@ionic/react';
import TemplateMainPage from './TemplateMainPage';

// don't use translations for debug page
const DebugPage = () => {
  if (platformService.isRelease()) {
    return <NotFound />;
  }

  return (
    <TemplateMainPage title={'Debug'}>
      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Platform(s)</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>(capacitor) platform: {platformService.getPlatform()}</p>
            <p>(ionic) platforms: {JSON.stringify(getPlatforms())}</p>
            <p>is dev: {platformService.isDev() ? 'yes' : 'no'}</p>
            <p>is android: {platformService.isAndroid() ? 'yes' : 'no'}</p>
            <p>is web: {platformService.isWeb() ? 'yes' : 'no'}</p>
            <p>is electron: {platformService.isElectron() ? 'yes' : 'no'}</p>
            <p>is wide: {platformService.isWideEnough() ? 'yes' : 'no'}</p>
            <p>
              sync enabled: {platformService.isSyncEnabled() ? 'yes' : 'no'}
            </p>
            <p>config: {JSON.stringify(appConfig)}</p>
          </IonCardContent>
        </IonCard>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Local Changes</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div>
              Number of changes:
              {localChangesService.getLocalChanges().length}
            </div>
            {localChangesService.getLocalChanges().length > 0 && (
              <>
                {/* TODO use this button to actually reset changes when feature is done */}
                <DeleteButton
                  color="danger"
                  trigger={`del-clear`}
                  message={`This might create syncing problems`}
                  onConfirm={() => {
                    localChangesService.clear();
                  }}
                >
                  Clear All
                </DeleteButton>
                {/* TODO add pagination */}
                <IonList style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {localChangesService.getLocalChanges(0, 20).map(lc => {
                    const type = collectionService.getItemType(lc.item);
                    let route, parent, doc;
                    switch (type) {
                      case CollectionItemType.folder:
                      case CollectionItemType.notebook:
                        route = GET_FOLDER_ROUTE(lc.item);
                        break;
                      case CollectionItemType.page:
                        doc = collectionService.getItemParent(lc.item);
                        parent = collectionService.getItemParent(doc);
                        route = GET_PAGE_ROUTE(parent, doc, lc.item);
                        break;
                      case CollectionItemType.document:
                        // eslint-disable-next-line no-case-declarations
                        parent = collectionService.getItemParent(lc.item);
                        route = GET_DOCUMENT_ROUTE(parent, lc.item);
                        break;
                    }

                    return (
                      <IonItem key={lc.id} routerLink={route}>
                        {!collectionService.itemExists(lc.item) && (
                          <IonIcon
                            slot="start"
                            icon={APPICONS.warning}
                          ></IonIcon>
                        )}
                        <IonIcon icon={APPICONS_PER_TYPE.get(type)}></IonIcon>
                        <IonText>
                          {collectionService
                            .getItemTitle(lc.item)
                            .substring(0, 15)}{' '}
                          <br />
                          {lc.item.substring(0, 6)}
                        </IonText>
                        <IonText slot="end">{lc.field || ''}</IonText>
                        <IonText slot="end">{lc.change}</IonText>
                        <IonText slot="end">
                          {new Date(lc.updated)
                            .toISOString()
                            .substring(0, 19)
                            .replace('T', ' ')}
                        </IonText>
                      </IonItem>
                    );
                  })}
                </IonList>
              </>
            )}
          </IonCardContent>
        </IonCard>

        {platformService.isAndroid() && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Logs</IonCardTitle>
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
            <GenericExportFileButton
              getFileContent={JSON.stringify(appLog.getLogs())}
              getFileTitle={() =>
                `${new Date().toISOString().substring(0, 19).replaceAll(/[:T]/g, '-')}-logs.json`
              }
              label={`Download Logs`}
              icon={null}
              fill="clear"
            />
          </IonCard>
        )}
      </IonContent>
    </TemplateMainPage>
  );
};
export default DebugPage;
