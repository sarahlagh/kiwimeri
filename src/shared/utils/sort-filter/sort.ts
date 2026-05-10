import { Id } from 'tinybase/with-schemas';

export type Sort<SortType> = {
  by: SortType;
  descending: boolean;
};

export type SortableType = {
  id: Id;
  order?: number;
};
