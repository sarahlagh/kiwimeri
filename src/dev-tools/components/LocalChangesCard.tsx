import { CollectionItemType } from '@/collection/collection';
import DeleteButton from '@/common/buttons/DeleteButton';
import {
  GET_DOCUMENT_ROUTE,
  GET_FOLDER_ROUTE,
  GET_PAGE_ROUTE
} from '@/common/routes';
import platformService from '@/common/services/platform.service';
import { APPICONS, APPICONS_PER_TYPE } from '@/constants';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/local-changes.service';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonList,
  IonText
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';

const LocalChangesCard = () => {
  const { t } = useLingui();
  const isRelease = platformService.isRelease();
  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Local Changes</Trans>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <div>
          <Trans>Number of changes:</Trans>
          {' ' + localChangesService.getLocalChanges().length}
        </div>
        {localChangesService.getLocalChanges().length > 0 && (
          <>
            {/* TODO use this button to actually reset changes when feature is done */}
            {!isRelease && (
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
            )}
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
                    {!collectionService.itemExists(lc.item) ? (
                      <>
                        <IonIcon
                          slot="start"
                          color="warning"
                          icon={APPICONS.warning}
                        ></IonIcon>
                        <IonText>{t`item doesn't exist`}</IonText>
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
                              .getItemTitle(lc.item)
                              .substring(0, 15)}
                          </b>
                          {platformService.isWideEnough() ? (
                            <>
                              {type !== CollectionItemType.page && <br />}
                              <i>
                                <sub>
                                  {collectionService.getItemPreview(lc.item)}
                                </sub>
                              </i>
                            </>
                          ) : (
                            type === CollectionItemType.page && (
                              <>
                                <i>
                                  <sub>
                                    {collectionService
                                      .getItemPreview(lc.item)
                                      .substring(0, 15)}
                                  </sub>
                                </i>
                              </>
                            )
                          )}
                        </IonText>
                      </>
                    )}
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
  );
};
export default LocalChangesCard;
