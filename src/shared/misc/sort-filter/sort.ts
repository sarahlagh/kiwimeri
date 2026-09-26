import { Id } from 'tinybase/with-schemas';

export type Sort<SortType extends string> = {
  by: SortType;
  descending: boolean;
};

export type SortableType = {
  id: Id;
  order?: number;
};
