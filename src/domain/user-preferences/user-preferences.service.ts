import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import {
  UserPreferenceKey,
  UserPreferenceValue,
  userPreferenceDefinitions
} from './model';

const UP = SpaceTables.UserPreference;

class UserPreferenceService {
  public get<P extends UserPreferenceKey>(pref: P): UserPreferenceValue<P> {
    const value = space.getCell(UP, pref, 'value');
    if (value === undefined) {
      return userPreferenceDefinitions[pref].default as UserPreferenceValue<P>;
    }
    return value._v as UserPreferenceValue<P>;
  }

  public getDefault<P extends UserPreferenceKey>(
    pref: P
  ): UserPreferenceValue<P> {
    return userPreferenceDefinitions[pref].default as UserPreferenceValue<P>;
  }

  public set<P extends UserPreferenceKey>(
    pref: P,
    value: UserPreferenceValue<P> | null
  ) {
    let finalValue;
    if (value === null) {
      finalValue = userPreferenceDefinitions[pref].default;
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
