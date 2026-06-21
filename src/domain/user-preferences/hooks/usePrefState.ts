import { SID, SpaceTables } from '@/core/db/store-schema';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import {
  UserPref,
  UserPreference,
  UserPreferenceRow
} from '@/domain/user-preferences/model';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

const UP = SpaceTables.UserPreference;

export default function usePrefState<P extends UserPreference>(
  pref: UserPreference
): [UserPref<P>, Dispatch<SetStateAction<UserPref<P>>>] {
  const cellValue = useSpaceCell(UP, pref, 'value', SID.space);
  const rawValue: UserPref<P> =
    cellValue !== undefined
      ? ((cellValue as UserPreferenceRow['value'])._v as UserPref<P>)
      : userPrefs.getDefault(pref);
  const [value, setValue] = useState<UserPref<P>>(rawValue);
  useEffect(() => {
    userPrefs.set(pref, value);
  }, [value]);
  return [value, setValue];
}
