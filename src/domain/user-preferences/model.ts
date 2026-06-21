import { msg } from '@lingui/core/macro';

export type UserPreferenceKey =
  | 'defaultSortBy'
  | 'defaultSortDesc'
  | 'historyIdleTime'
  | 'historyMaxInterval'
  | 'maxHistoryPerDoc'
  | 'statsEnabled';

export const userPreferenceDefinitions = {
  defaultSortBy: {
    type: 'string',
    default: 'created',
    label: msg`Default sort field`
  },
  defaultSortDesc: {
    type: 'boolean',
    default: false,
    label: msg`Sort descending by default`
  },
  historyIdleTime: {
    type: 'number',
    default: 15000,
    label: msg`History idle time (s)`
  },
  historyMaxInterval: {
    type: 'number',
    default: 300000,
    label: msg`History save time (min)`
  },
  maxHistoryPerDoc: {
    type: 'number',
    default: 50,
    label: msg`Number of versions`
  },
  statsEnabled: {
    type: 'boolean',
    default: false,
    label: msg`Track text statistics`
  }
} as const satisfies Record<UserPreferenceKey, unknown>;
type UserPreferenceDefinitions = typeof userPreferenceDefinitions;

export type UserPreferenceRow = {
  value: { _v: string | number | boolean };
  updatedAt: number;
};

export const userPreferenceSchema = {
  value: { type: 'object' },
  updatedAt: { type: 'number' }
} as const satisfies Record<keyof UserPreferenceRow, unknown>;

export type UserPreferenceValue<
  P extends UserPreferenceKey,
  PType = UserPreferenceDefinitions[P]['type']
> = PType extends 'number'
  ? number
  : PType extends 'boolean'
    ? boolean
    : string;

export type SyncableUserPref = {
  id: string;
} & UserPreferenceRow;

export type UserPrefUpdatableFieldEnum = keyof Pick<UserPreferenceRow, 'value'>;
export const UserPrefUpdatableFields: UserPrefUpdatableFieldEnum[] = ['value'];
