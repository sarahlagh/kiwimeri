import { SID } from '@/core/db/store-constants';
import { SpaceValue, SpaceValueType } from '@/core/db/store-schema';
import { useSpaceValue } from '@/core/db/tinybase-hooks';

export default function useDeviceSetting<S extends SpaceValue>(
  setting: S
): SpaceValueType<S> {
  return useSpaceValue<S>(setting, SID.space);
}
