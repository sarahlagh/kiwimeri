import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-schema';
import {
  UserPreferenceKey,
  userPreferenceDefinitions
} from '@/domain/user-preferences/model';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import { adv } from '@@/_setup/test.utils';

const allPrefs: UserPreferenceKey[] = Object.keys(
  userPreferenceDefinitions
) as UserPreferenceKey[];

describe('user prefs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return default value if user pref not set', () => {
    allPrefs.forEach(pref => {
      expect(userPrefs.get(pref as UserPreferenceKey)).toBeDefined();
      expect(userPrefs.get(pref as UserPreferenceKey)).toBe(
        userPreferenceDefinitions[pref].default
      );
    });
  });

  it('should return user value if set', () => {
    expect(userPrefs.get('historyIdleTime')).toBe(
      userPreferenceDefinitions.historyIdleTime.default
    );
    const before = Date.now();
    adv(() => userPrefs.set('historyIdleTime', 52));
    expect(userPrefs.get('historyIdleTime')).toBe(52);
    expect(userPrefs.get('historyIdleTime')).not.toBe(
      userPreferenceDefinitions.historyIdleTime.default
    );
    expect(
      space.getCell(SpaceTables.UserPreference, 'historyIdleTime', 'updatedAt')
    ).toBeGreaterThan(before);
  });

  it('should unset a user value', () => {
    userPrefs.set('historyIdleTime', 52);
    expect(userPrefs.get('historyIdleTime')).toBe(52);

    const before = Date.now();
    adv(() => userPrefs.set('historyIdleTime', null));
    expect(userPrefs.get('historyIdleTime')).toBe(
      userPreferenceDefinitions.historyIdleTime.default
    );
    expect(
      space.getCell(SpaceTables.UserPreference, 'historyIdleTime', 'updatedAt')
    ).toBeGreaterThan(before);
  });

  it('should not unset the default value', () => {
    const before = Date.now();
    adv(() => userPrefs.set('historyIdleTime', null));
    expect(userPrefs.get('historyIdleTime')).toBe(
      userPreferenceDefinitions.historyIdleTime.default
    );
    expect(
      space.getCell(SpaceTables.UserPreference, 'historyIdleTime', 'updatedAt')
    ).toBeGreaterThan(before);
  });
});
