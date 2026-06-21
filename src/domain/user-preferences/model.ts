export type UserPreference =
  | 'defaultSortBy'
  | 'defaultSortDesc'
  | 'historyIdleTime'
  | 'historyMaxInterval'
  | 'maxHistoryPerDoc'
  | 'statsEnabled';

export const userPreferenceDefaults = {
  defaultSortBy: { type: 'string', default: 'created' },
  defaultSortDesc: { type: 'boolean', default: false },
  historyIdleTime: { type: 'number', default: 15000 },
  historyMaxInterval: { type: 'number', default: 300000 },
  maxHistoryPerDoc: { type: 'number', default: 50 },
  statsEnabled: { type: 'boolean', default: false }
} as const satisfies Record<UserPreference, unknown>;
type UserPreferenceDefaults = typeof userPreferenceDefaults;

export type UserPreferenceRow = {
  value: { _v: string | number | boolean };
  updatedAt: number;
};

export const userPreferenceSchema = {
  value: { type: 'object' },
  updatedAt: { type: 'number' }
} as const satisfies Record<keyof UserPreferenceRow, unknown>;

export type UserPref<
  P extends UserPreference,
  PType = UserPreferenceDefaults[P]['type']
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
