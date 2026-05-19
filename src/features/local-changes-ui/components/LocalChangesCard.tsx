import { CollectionItemType } from '@/collection/collection';
import DeleteButton from '@/common/buttons/DeleteButton';
import { dateToStr } from '@/common/date-utils';
import { GET_UNKNOWN_ITEM_ROUTE, SETTINGS_ROUTE } from '@/common/routes';
import platformService from '@/common/services/platform.service';
import { APPICONS, APPICONS_PER_TYPE } from '@/constants';
import collectionService from '@/db/collection.service';
import remotesService from '@/db/remotes.service';
import { commentsService } from '@/domain/comments/comments.service';
import localChangesService from '@/domain/local-changes/local-changes.service';
import fetchLocalChangesQuery from '@/domain/local-changes/queries/fetchLocalChangesQuery';
import { searchAncestryService } from '@/search/search-ancestry.service';
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
import {
  closeLatestCollectionUpdateMetric,
  initLatestCollectionUpdateMetric
} from '../metrics';

const LocalChangesCard = () => {
  const { t } = useLingui();
  const isRelease = platformService.isRelease();
  const isWideEnough = platformService.isWideEnough();
  const localChanges = fetchLocalChangesQuery.useResults();
  const lastLocalChange = useLatestUpdatedAt();
  const lastRemoteChange = remotesService.usePrimaryLastRemoteChange();
  const weightLocal = lastRemoteChange >= lastLocalChange ? 'normal' : 'bold';
  const weightRemote = lastRemoteChange < lastLocalChange ? 'normal' : 'bold';

  useIonViewDidEnter(() => {
    fetchLocalChangesQuery.initQuery();
    initLatestCollectionUpdateMetric();
  });
  useIonViewDidLeave(() => {
    fetchLocalChangesQuery.close();
    closeLatestCollectionUpdateMetric();
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
            <Trans>
              Local:&nbsp;
              {dateToStr('datetime', lastLocalChange)}
            </Trans>
          </IonLabel>

          <IonLabel slot="end" style={{ fontWeight: weightRemote }}>
            <Trans>
              Remote:&nbsp;
              {dateToStr('datetime', lastRemoteChange)}
            </Trans>
          </IonLabel>
        </IonItem>
        {/* TODO use this button to actually reset changes when feature is done */}

        {localChanges.length > 0 && (
          <>
            <IonList style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {localChanges.map(lc => {
                if (lc.on === 'values') {
                  return (
                    <IonItem key={lc.id} routerLink={SETTINGS_ROUTE}>
                      <IonIcon
                        slot="start"
                        icon={APPICONS.settingsPage}
                      ></IonIcon>
                      <IonText>{t`space option modified`}</IonText>
                      <IonText slot="end">
                        {dateToStr('datetime', lc.createdAt)}
                      </IonText>
                    </IonItem>
                  );
                }
                let type;
                let route;
                if (lc.on === 'collection') {
                  type = collectionService.getItemType(lc.itemId);
                  route = GET_UNKNOWN_ITEM_ROUTE(lc.itemId, type);
                } else {
                  const document = commentsService.getCommentInfo(
                    lc.itemId
                  ).itemId;
                  type = CollectionItemType.document;
                  route = GET_UNKNOWN_ITEM_ROUTE(
                    document,
                    CollectionItemType.document
                  );
                }
                return (
                  <IonItem key={lc.id} routerLink={route}>
                    {!collectionService.itemExists(lc.itemId) ? (
                      <>
                        <IonIcon
                          slot="start"
                          color="warning"
                          icon={APPICONS.warning}
                        ></IonIcon>
                        <IonText>{t`deleted item`}</IonText>
                      </>
                    ) : (
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
                          {isWideEnough ? (
                            <>
                              {type !== CollectionItemType.page && <br />}
                              <i>
                                <sub>
                                  {searchAncestryService
                                    .getItemPreview(lc.itemId)
                                    .substring(0, 200)}
                                </sub>
                              </i>
                            </>
                          ) : (
                            type === CollectionItemType.page && (
                              <>
                                <i>
                                  <sub>
                                    {searchAncestryService
                                      .getItemPreview(lc.itemId)
                                      .substring(0, 15)}
                                  </sub>
                                </i>
                              </>
                            )
                          )}
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
