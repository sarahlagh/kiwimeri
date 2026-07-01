import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import {
  UserPreferenceKey,
  UserPreferenceRow,
  UserPreferenceValue
} from '@/domain/user-preferences/user-preferences';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';

const UP = SpaceTables.UserPreference;
export default function usePref<P extends UserPreferenceKey>(
  pref: P
): UserPreferenceValue<P> {
  const cellValue = useSpaceCell(UP, pref, 'value');
  if (!cellValue) return userPrefs.getDefault<P>(pref);
  return (cellValue as UserPreferenceRow['value'])._v as UserPreferenceValue<P>;
}
