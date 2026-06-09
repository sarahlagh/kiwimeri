import { space } from '@/core/db/store';
import {
  USER_PREFERENCE_TABLE,
  UserPref,
  UserPreference,
  userPreferenceDefaults
} from './model';

const UP = USER_PREFERENCE_TABLE;

class UserPreferenceService {
  public get<P extends UserPreference>(pref: UserPreference): UserPref<P> {
    const value = space.getCell(UP, pref, 'value');
    if (value === undefined) {
      return userPreferenceDefaults[pref].default as UserPref<P>;
    }
    return value._v as UserPref<P>;
  }

  public getDefault<P extends UserPreference>(
    pref: UserPreference
  ): UserPref<P> {
    return userPreferenceDefaults[pref].default as UserPref<P>;
  }

  public set<P extends UserPreference>(
    pref: UserPreference,
    value: UserPref<P> | null
  ) {
    let finalValue;
    if (value === null) {
      finalValue = userPreferenceDefaults[pref].default;
    } else {
      finalValue = value;
    }
    space.setPartialRow(UP, pref, {
      value: { _v: finalValue },
      updatedAt: Date.now()
    });
  }
}

export const userPrefs = new UserPreferenceService();
