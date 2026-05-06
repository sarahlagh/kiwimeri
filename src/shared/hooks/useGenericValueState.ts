import { SpaceType } from '@/db/types/space-types';
import { StoreType } from '@/db/types/store-types';
import { ValueIdFromSchema } from 'tinybase/@types/_internal/store/with-schemas';
import { StoreOrStoreId, useValueState } from 'tinybase/ui-react';
import { OptionalSchemas, Value } from 'tinybase/with-schemas';

function useGenericValueState<
  Schema extends OptionalSchemas,
  ValueId extends ValueIdFromSchema<Schema[1]>,
  R extends Value<Schema[1], ValueId>
>(
  value: ValueId,
  storeOrStoreId?: StoreOrStoreId | undefined
): [R, (v: R) => void] {
  const [val, setVal] = useValueState(value, storeOrStoreId);
  return [val as R, setVal as (v: R) => void];
}

export function useStoreValueState<
  R extends Value<StoreType[1], ValueIdFromSchema<StoreType[1]>>
>(value: ValueIdFromSchema<StoreType[1]>) {
  return useGenericValueState<StoreType, ValueIdFromSchema<StoreType[1]>, R>(
    value,
    'store'
  );
}

export function useSpaceValueState<
  R extends Value<SpaceType[1], ValueIdFromSchema<SpaceType[1]>>
>(value: ValueIdFromSchema<SpaceType[1]>) {
  return useGenericValueState<SpaceType, ValueIdFromSchema<SpaceType[1]>, R>(
    value,
    'store'
  );
}
