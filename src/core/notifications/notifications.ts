import { Id } from 'tinybase/with-schemas';
import { SpaceTables } from '../db/store-constants';
import { AnyData, WithId } from '../db/types';

export type AppNotificationCtx = {
  rowId?: Id;
  on?: SpaceTables;
} & AnyData;

export type AppNotificationLevel = 'error' | 'warning' | 'info';
export type AppNotification = {
  createdAt: number;
  profile?: string;
  level: AppNotificationLevel;
  message: string;
  context?: AppNotificationCtx;
  ackAt?: number;
};

export type AppNotificationResult = WithId<Omit<AppNotification, 'profile'>>;

export const notificationsSchema = {
  createdAt: { type: 'number' },
  profile: { type: 'string' },
  level: { type: 'string' },
  message: { type: 'string' },
  context: { type: 'object' },
  ackAt: { type: 'number' }
} as const satisfies Record<keyof AppNotification, unknown>;

export function getNotificationColor(level: AppNotificationLevel) {
  switch (level) {
    case 'error':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'info':
      return 'success';
  }
}
