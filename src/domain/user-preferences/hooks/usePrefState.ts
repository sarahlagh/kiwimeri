import { SID, SpaceTables } from '@/core/db/store-schema';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import {
  UserPreferenceKey,
  UserPreferenceRow,
  UserPreferenceValue
} from '@/domain/user-preferences/model';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

const UP = SpaceTables.UserPreference;

export default function usePrefState<P extends UserPreferenceKey>(
  pref: UserPreferenceKey
): [UserPreferenceValue<P>, Dispatch<SetStateAction<UserPreferenceValue<P>>>] {
  const cellValue = useSpaceCell(UP, pref, 'value', SID.space);
  const rawValue: UserPreferenceValue<P> =
    cellValue !== undefined
      ? ((cellValue as UserPreferenceRow['value'])._v as UserPreferenceValue<P>)
      : userPrefs.getDefault(pref);
  const [value, setValue] = useState<UserPreferenceValue<P>>(rawValue);
  useEffect(() => {
    userPrefs.set(pref, value);
  }, [value]);
  return [value, setValue];
}
