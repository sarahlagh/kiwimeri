import { Id } from 'tinybase/with-schemas';
import { getCurrentProfile, store } from '../db/store';
import { StoreTables } from '../db/store-constants';
import { AppNotificationCtx, AppNotificationLevel } from './notifications';

const N = StoreTables.Notifications;

class AppNotificationService {
  public send(
    level: AppNotificationLevel,
    message: string,
    context?: AppNotificationCtx
  ) {
    store.addRow(N, {
      createdAt: Date.now(),
      profile: getCurrentProfile(),
      level,
      message,
      context
    });
  }

  public ack(notifId: Id) {
    if (store.hasRow(N, notifId)) {
      store.setCell(N, notifId, 'ackAt', Date.now());
    }
  }

  public unAck(notifId: Id) {
    if (store.hasRow(N, notifId)) {
      store.delCell(N, notifId, 'ackAt');
    }
  }

  // TODO gc
}

export const notifsSvc = new AppNotificationService();
