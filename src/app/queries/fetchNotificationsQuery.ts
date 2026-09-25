import { StoreQueryDefinition } from '@/core/db/queries-helper';
import { getCurrentProfile } from '@/core/db/store';
import { StoreTables } from '@/core/db/store-constants';
import { AppNotificationResult } from '@/core/notifications/notifications';
import { ParamValues } from 'tinybase/with-schemas';

const fetchNotificationsQuery = new StoreQueryDefinition<
  ParamValues,
  AppNotificationResult,
  StoreTables.Notifications
>(
  'fetchNotificationsQuery',
  StoreTables.Notifications,
  ({ select, where }) => {
    select('createdAt');
    select('level');
    select('message');
    select('context');
    where('profile', getCurrentProfile());
    where(getTableCell => {
      return getTableCell('ackAt') === undefined;
    });
  },
  'createdAt',
  false
);

export default fetchNotificationsQuery;
