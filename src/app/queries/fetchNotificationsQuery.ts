import { StoreQueryDefinition } from '@/core/db/queries-helper';
import { StoreTables } from '@/core/db/store-constants';
import { plt } from '@/core/infra/platform';
import { AppNotificationResult } from '@/core/notifications/notifications';

type NotificationsQueryParam = {
  all?: boolean;
};

const fetchNotificationsQuery = new StoreQueryDefinition<
  NotificationsQueryParam,
  AppNotificationResult,
  StoreTables.Notifications
>(
  'fetchNotificationsQuery',
  StoreTables.Notifications,
  ({ select, where, param }) => {
    const params: NotificationsQueryParam = {
      all: param('all') as boolean
    };

    select('createdAt');
    select('level');
    select('message');
    select('context');
    select('ackAt');
    where('profile', plt.getCurrentProfile());

    if (!params.all) {
      where(getTableCell => {
        return getTableCell('ackAt') === undefined;
      });
    }
  },
  'createdAt',
  false
);

export default fetchNotificationsQuery;
