import DeleteButton from '@/common_to_migrate/buttons/DeleteButton';
import { dateToStr } from '@/common_to_migrate/date-utils';
import {
  GET_UNKNOWN_ITEM_ROUTE,
  SETTINGS_ROUTE
} from '@/common_to_migrate/routes';
import platformService from '@/common_to_migrate/services/platform.service';
import { APPICONS } from '@/constants';
import { useQueryResults } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { plt } from '@/core/infra/platform';
import collectionService from '@/db_to_migrate/collection.service';
import {
  APPICONS_PER_TYPE,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/domain/collection/collection';
import { docAnnotationsService } from '@/domain/collection/doc-annotations.service';
import localChangesService from '@/domain/synchronization/local-changes.service';
import {
  UserPreferenceKey,
  userPreferenceDefinitions
} from '@/domain/user-preferences/user-preferences';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  useIonViewDidEnter,
  useIonViewDidLeave
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import useLatestUpdatedAt from '../hooks/useLatestUpdatedAt';
import usePrimaryLastRemoteChange from '../hooks/usePrimaryLastRemoteChange';
import {
  closeLatestCollectionUpdateMetric,
  initLatestCollectionUpdateMetric
} from '../metrics';
import fetchLocalChangesQuery from '../queries/fetchLocalChangesQuery';

// keep outside for tests
export function onRouteEnter() {
  fetchLocalChangesQuery.initQuery();
  initLatestCollectionUpdateMetric();
}
export function onRouteLeave() {
  fetchLocalChangesQuery.close();
  closeLatestCollectionUpdateMetric();
}

const LocalChangesCard = () => {
  const { t, i18n } = useLingui();
  const isRelease = plt.isRelease();
  const isWideEnough = platformService.isWideEnough();
  const localChanges = useQueryResults(fetchLocalChangesQuery);
  const lastLocalChange = useLatestUpdatedAt();
  const lastRemoteChange = usePrimaryLastRemoteChange();
  const weightLocal = lastRemoteChange >= lastLocalChange ? 'normal' : 'bold';
  const weightRemote = lastRemoteChange < lastLocalChange ? 'normal' : 'bold';

  useIonViewDidEnter(() => {
    onRouteEnter();
  });
  useIonViewDidLeave(() => {
    onRouteLeave();
  });

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Local Changes ({localChanges.length})</Trans>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonItem lines="none">
          <IonLabel slot="start" style={{ fontWeight: weightLocal }}>
            {lastLocalChange > 0 ? (
              <Trans>
                Local:&nbsp; {dateToStr('datetime', lastLocalChange)}
              </Trans>
            ) : (
              <Trans>
                Local:&nbsp;
                <i>never</i>
              </Trans>
            )}
          </IonLabel>

          <IonLabel slot="end" style={{ fontWeight: weightRemote }}>
            {lastRemoteChange > 0 ? (
              <Trans>
                Remote:&nbsp; {dateToStr('datetime', lastRemoteChange)}
              </Trans>
            ) : (
              <Trans>
                Remote:&nbsp;
                <i>never</i>
              </Trans>
            )}
          </IonLabel>
        </IonItem>
        {/* TODO use this button to actually reset changes when feature is done */}

        {localChanges.length > 0 && (
          <>
            <IonList style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {localChanges.map(lc => {
                let preview = '';
                let type: CollectionItemTypeValues =
                  CollectionItemType.document;
                let route;
                let itemExists = true;
                if (lc.on === SpaceTables.Collection) {
                  type = collectionService.getItemType(lc.itemId);
                  route = GET_UNKNOWN_ITEM_ROUTE(lc.itemId, type);
                  itemExists = collectionService.itemExists(lc.itemId);
                  preview = itemExists
                    ? collectionService
                        .getDocumentPreview(lc.itemId)
                        .substring(0, 200)
                    : '';
                } else if (lc.on === SpaceTables.Annotations) {
                  const document = docAnnotationsService.getAnnotInfo(
                    lc.itemId
                  ).itemId;
                  type = CollectionItemType.document;
                  route = GET_UNKNOWN_ITEM_ROUTE(
                    document,
                    CollectionItemType.document
                  );
                  itemExists = docAnnotationsService.exists(lc.itemId);
                  preview = itemExists
                    ? docAnnotationsService.getPreview(lc.itemId)
                    : '';
                } else {
                  route = SETTINGS_ROUTE;
                }
                return (
                  <IonItem
                    key={lc.id}
                    routerLink={route}
                    data-testid={`lc-key-${lc.id}`}
                  >
                    {!itemExists && (
                      <>
                        <IonIcon
                          slot="start"
                          color="warning"
                          icon={APPICONS.warning}
                        ></IonIcon>
                        <IonText>{t`deleted item`}</IonText>
                      </>
                    )}

                    {itemExists && lc.on === SpaceTables.Collection && (
                      <>
                        <IonIcon
                          slot="start"
                          icon={APPICONS_PER_TYPE.get(type)}
                        ></IonIcon>
                        <IonText>
                          <b>
                            {collectionService
                              .getItemTitle(lc.itemId)
                              .substring(0, 15)}
                          </b>
                          {isWideEnough && (
                            <>
                              <br />
                              <i>
                                <sub>{preview}</sub>
                              </i>
                            </>
                          )}
                        </IonText>
                      </>
                    )}

                    {itemExists && lc.on === SpaceTables.Annotations && (
                      <>
                        <IonIcon
                          slot="start"
                          icon={APPICONS.annotation}
                        ></IonIcon>
                        <IonText>
                          {isWideEnough ? (
                            <i>{preview}</i>
                          ) : (
                            <i>{preview.substring(0, 15)}</i>
                          )}
                        </IonText>
                      </>
                    )}

                    {itemExists && lc.on === SpaceTables.UserPreference && (
                      <>
                        <IonIcon
                          slot="start"
                          icon={APPICONS.settingsPage}
                        ></IonIcon>
                        <IonText>
                          <i>
                            <Trans>Space setting modified:</Trans>{' '}
                            {i18n._(
                              userPreferenceDefinitions[
                                lc.itemId as UserPreferenceKey
                              ].label
                            )}
                          </i>
                        </IonText>
                      </>
                    )}

                    {isWideEnough && (
                      <>
                        {/* TODO translate field & change */}
                        <IonText slot="end">{lc.field || ''}</IonText>
                        <IonText slot="end">{lc.change}</IonText>
                      </>
                    )}
                    <IonText slot="end">
                      {dateToStr('datetime', lc.createdAt)}
                    </IonText>
                  </IonItem>
                );
              })}
            </IonList>
            {!isRelease && (
              <IonItem lines="none">
                <DeleteButton
                  color="danger"
                  trigger={`del-clear`}
                  message={`This might create syncing problems`}
                  onConfirm={() => {
                    localChangesService.clear();
                  }}
                >
                  <Trans>Clear All</Trans>
                </DeleteButton>
              </IonItem>
            )}
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};
export default LocalChangesCard;
