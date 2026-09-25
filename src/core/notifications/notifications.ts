import { AnyData, WithId } from '../db/types';

export type AppNotificationLevel = 'error' | 'warning' | 'info';
export type AppNotification = {
  createdAt: number;
  profile?: string;
  level: AppNotificationLevel;
  message: string;
  context?: AnyData;
  ackAt?: number;
};

export type AppNotificationResult = WithId<
  Omit<AppNotification, 'profile' | 'ackAt'>
>;

export const notificationsSchema = {
  createdAt: { type: 'number' },
  profile: { type: 'string' },
  level: { type: 'string' },
  message: { type: 'string' },
  context: { type: 'object' },
  ackAt: { type: 'number' }
} as const satisfies Record<keyof AppNotification, unknown>;
