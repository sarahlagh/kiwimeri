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

export type WithId = {
  id: Id;
};
