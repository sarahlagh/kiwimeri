import { APPICONS_PER_TYPE, CollectionItemType } from '@/collection/collection';
import DeleteButton from '@/common/buttons/DeleteButton';
import { dateToStr } from '@/common/date-utils';
import { GET_UNKNOWN_ITEM_ROUTE, SETTINGS_ROUTE } from '@/common/routes';
import platformService from '@/common/services/platform.service';
import { APPICONS } from '@/constants';
import { useQueryResults } from '@/core/db/queries-helper';
import { plt } from '@/core/infra/platform';
import collectionService from '@/db/collection.service';
import remotesService from '@/db/remotes.service';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import { DOC_ANNOTATION_TABLE } from '@/domain/document-annotations/model';
import localChangesService from '@/domain/local-changes/local-changes.service';
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
  const { t } = useLingui();
  const isRelease = plt.isRelease();
  const isWideEnough = platformService.isWideEnough();
  const localChanges = useQueryResults(fetchLocalChangesQuery);
  const lastLocalChange = useLatestUpdatedAt();
  const lastRemoteChange = remotesService.usePrimaryLastRemoteChange();
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
                if (lc.on === 'values') {
                  return (
                    <IonItem
                      key={lc.id}
                      data-testid={`lc-key-${lc.id}`}
                      routerLink={SETTINGS_ROUTE}
                    >
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
                let preview = '';
                let type;
                let route;
                let itemExists = true;
                if (lc.on === 'collection') {
                  type = collectionService.getItemType(lc.itemId);
                  route = GET_UNKNOWN_ITEM_ROUTE(lc.itemId, type);
                  itemExists = collectionService.itemExists(lc.itemId);
                  preview = itemExists
                    ? searchAncestryService
                        .getItemPreview(lc.itemId)
                        .substring(0, 200)
                    : '';
                } else {
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

                    {itemExists && lc.on === 'collection' && (
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
                                <sub>{preview}</sub>
                              </i>
                            </>
                          ) : (
                            type === CollectionItemType.page && (
                              <>
                                <i>
                                  <sub>{preview.substring(0, 15)}</sub>
                                </i>
                              </>
                            )
                          )}
                        </IonText>
                      </>
                    )}

                    {itemExists && lc.on === DOC_ANNOTATION_TABLE && (
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
