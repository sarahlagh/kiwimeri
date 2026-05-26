import {
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
