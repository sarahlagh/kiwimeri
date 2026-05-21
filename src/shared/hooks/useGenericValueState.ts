import {
  SpaceType,
  SpaceValue,
  SpaceValuesType,
  StoreType,
  StoreValue,
  StoreValuesType
} from '@/core/db/store-schema';
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
  R extends Value<StoreValuesType, StoreValue>
>(value: ValueIdFromSchema<StoreValuesType>) {
  return useGenericValueState<StoreType, StoreValue, R>(value, 'store');
}

export function useSpaceValueState<
  R extends Value<SpaceValuesType, SpaceValue>
>(value: SpaceValue) {
  return useGenericValueState<SpaceType, SpaceValue, R>(value, 'store');
}
