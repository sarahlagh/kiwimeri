import {
  AnyArray,
  AnyObject,
  Id,
  OptionalTablesSchema,
  OptionalValuesSchema
} from 'tinybase/with-schemas';

export type AsId<Key> = Exclude<Key & Id, number>;
export type TableIdFromSchema<Schema extends OptionalTablesSchema> = AsId<
  keyof Schema
>;
export type ValueIdFromSchema<Schema extends OptionalValuesSchema> = AsId<
  keyof Schema
>;

export type CellIdFromSchema<
  Schema extends OptionalTablesSchema,
  TableId extends TableIdFromSchema<Schema>
> = AsId<keyof Schema[TableId]>;

export type TypeWithId = {
  id: Id;
};
export type WithId<R> = {
  id: Id;
} & R;

export interface AnyData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

export type SerializableDataType = 'string' | 'number' | 'boolean';
export type SerializableData = string | number | boolean;

export type DbSerializableData =
  | string
  | number
  | boolean
  | AnyObject
  | AnyArray;

export interface AnySerializableData {
  [k: string]: SerializableData;
}

export const metaSchemaDefault = { u: 0 };
export interface MetaField extends AnyObject {
  _u: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const setMetaField = (updated: number, value?: unknown): MetaField => {
  return { _u: updated };
};
