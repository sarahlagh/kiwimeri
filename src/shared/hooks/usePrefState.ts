import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import {
  UserPreferenceKey,
  UserPreferenceRow,
  UserPreferenceValue
} from '@/domain/user-preferences/user-preferences';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

const UP = SpaceTables.UserPreference;

export default function usePrefState<P extends UserPreferenceKey>(
  pref: P
): [UserPreferenceValue<P>, Dispatch<SetStateAction<UserPreferenceValue<P>>>] {
  const cellValue = useSpaceCell(
    UP,
    pref,
    'value'
  ) as UserPreferenceRow['value'];
  const rawValue: UserPreferenceValue<P> =
    cellValue !== undefined
      ? (cellValue._v as UserPreferenceValue<P>)
      : userPrefs.getDefault<P>(pref);
  const [value, setValue] = useState<UserPreferenceValue<P>>(rawValue);
  useEffect(() => {
    userPrefs.set(pref, value);
  }, [value]);
  return [value, setValue];
}
