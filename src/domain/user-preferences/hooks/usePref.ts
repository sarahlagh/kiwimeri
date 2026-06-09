import { SID } from '@/core/db/store-schema';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import {
  USER_PREFERENCE_TABLE,
  UserPref,
  UserPreference,
  UserPreferenceRow
} from '@/domain/user-preferences/model';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';

export default function usePref<P extends UserPreference>(
  pref: UserPreference
): UserPref<P> {
  const cellValue = useSpaceCell(
    USER_PREFERENCE_TABLE,
    pref,
    'value',
    SID.space
  );
  if (!cellValue) return userPrefs.getDefault(pref);
  return (cellValue as UserPreferenceRow['value'])._v as UserPref<P>;
}
