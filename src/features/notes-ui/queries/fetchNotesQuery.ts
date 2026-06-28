import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { NoteResult } from '../model';

export type FetchNotesQueryParam = {
  itemId: string;
};

const fetchNotesQuery = new SpaceQueryDefinition<
  FetchNotesQueryParam,
  NoteResult,
  SpaceTables.Annotations
>('fetchNotes', SpaceTables.Annotations, ({ select, where, param }) => {
  const params: FetchNotesQueryParam = {
    itemId: param('itemId') as string
  };
  select('createdAt');
  select('order');
  select('conflictId');
  where('itemId', params.itemId);
});

export default fetchNotesQuery;
