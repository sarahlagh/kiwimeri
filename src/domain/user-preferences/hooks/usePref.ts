import { SID, SpaceTables } from '@/core/db/store-schema';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import {
  UserPref,
  UserPreference,
  UserPreferenceRow
} from '@/domain/user-preferences/model';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';

const UP = SpaceTables.UserPreference;
export default function usePref<P extends UserPreference>(
  pref: UserPreference
): UserPref<P> {
  const cellValue = useSpaceCell(UP, pref, 'value', SID.space);
  if (!cellValue) return userPrefs.getDefault(pref);
  return (cellValue as UserPreferenceRow['value'])._v as UserPref<P>;
}
