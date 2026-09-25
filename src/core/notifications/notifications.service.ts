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
    return store.addRow(N, {
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

  public gc() {
    console.log('running notifications gc');
    const now = Date.now();
    let count = 0;
    store.transaction(() => {
      const table = store.getTable(N);
      store.getRowIds(N).forEach(rowId => {
        if (
          table[rowId].ackAt !== undefined &&
          now - table[rowId].ackAt > 3600_000
        ) {
          store.delRow(N, rowId);
          count++;
        }
      });
    });
    console.log('notifications gc done, deleted', count);
  }
}

export const notifsSvc = new AppNotificationService();
