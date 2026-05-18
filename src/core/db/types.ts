import { Id, OptionalTablesSchema } from 'tinybase/with-schemas';

export type WithId = {
  id: Id;
};

export type AsId<Key> = Exclude<Key & Id, number>;
export type TableIdFromSchema<Schema extends OptionalTablesSchema> = AsId<
  keyof Schema
>;
