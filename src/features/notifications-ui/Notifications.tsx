import fetchNotificationsQuery from '@/app/queries/fetchNotificationsQuery';
import { GET_UNKNOWN_ITEM_ROUTE } from '@/app/routes';
import { APPICONS } from '@/constants';
import { useQueryResults } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import {
  AppNotificationLevel,
  AppNotificationResult,
  getNotificationColor
} from '@/core/notifications/notifications';
import { notifsSvc } from '@/core/notifications/notifications.service';
import { CollectionItemType } from '@/domain/collection/collection';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import useIsWideEnough from '@/shared/hooks/useIsWideEnough';
import { dateToStr } from '@/shared/misc/date-utils';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList
} from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { useNavigate } from 'react-router';

export function getNotificationIcon(level: AppNotificationLevel) {
  switch (level) {
    case 'error':
      return APPICONS.warning;
    case 'warning':
      return APPICONS.warning;
    case 'info':
      return APPICONS.info;
  }
}

function canOpenDocument(notif: AppNotificationResult) {
  return (
    notif.context &&
    notif.context.rowId &&
    (notif.context.on === SpaceTables.Collection ||
      notif.context.on === SpaceTables.Annotations)
  );
}

const Notifications = () => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const isWideEnough = useIsWideEnough();
  const notifications = useQueryResults(
    fetchNotificationsQuery,
    'createdAt',
    true
  );
  return (
    <IonList>
      {notifications.map(notif => (
        <IonItemSliding key={notif.id}>
          <IonItem
            color={
              notif.ackAt === undefined
                ? getNotificationColor(notif.level)
                : undefined
            }
          >
            <IonIcon
              slot="start"
              icon={getNotificationIcon(notif.level)}
            ></IonIcon>
            {notif.message}
            {isWideEnough && (
              <IonLabel slot="end">
                {dateToStr('relative', notif.createdAt)}
              </IonLabel>
            )}
            <IonButtons slot="end">
              <IonButton id={`info_${notif.id}`} aria-label={t`Show details`}>
                <IonIcon icon={APPICONS.info} />
              </IonButton>
            </IonButtons>
            <IonAlert
              header={notif.message}
              trigger={`info_${notif.id}`}
              message={t`Acknowledged at: ${notif.ackAt !== undefined ? dateToStr('datetime', notif.ackAt) : 'never'} </br> Context: ${notif.context ? JSON.stringify(notif.context) : 'none'}`}
              buttons={[
                ...(canOpenDocument(notif)
                  ? [
                      {
                        text: t`Open document`,
                        handler: function () {
                          const rowId = notif.context!.rowId!;
                          const on = notif.context!.on!;
                          if (on === SpaceTables.Collection) {
                            navigate(
                              GET_UNKNOWN_ITEM_ROUTE(
                                rowId,
                                CollectionItemType.document
                              )
                            );
                          } else {
                            const document =
                              annotsService.getAnnotInfo(rowId).parentId;
                            navigate(
                              GET_UNKNOWN_ITEM_ROUTE(
                                document,
                                CollectionItemType.document
                              )
                            );
                          }
                        }
                      }
                    ]
                  : []),
                {
                  text: t`close`
                }
              ]}
            />
          </IonItem>
          <IonItemOptions>
            <IonItemOption>
              <IonButtons>
                {notif.ackAt === undefined && (
                  <IonButton
                    aria-label={t`Acknowledge`}
                    onClick={() => {
                      notifsSvc.ack(notif.id);
                    }}
                  >
                    <IonIcon icon={APPICONS.checkAction} />
                  </IonButton>
                )}
                {notif.ackAt !== undefined && (
                  <IonButton
                    aria-label={t`Mark unread`}
                    onClick={() => {
                      notifsSvc.unAck(notif.id);
                    }}
                  >
                    <IonIcon icon={APPICONS.uncheckAction} />
                  </IonButton>
                )}
              </IonButtons>
            </IonItemOption>
          </IonItemOptions>
        </IonItemSliding>
      ))}
    </IonList>
  );
};
export default Notifications;
