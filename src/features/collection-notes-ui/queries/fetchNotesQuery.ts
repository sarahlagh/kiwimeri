import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { NoteResult } from '../model';

export type FetchNotesQueryParam = {
  parentId: string;
};

const fetchNotesQuery = new SpaceQueryDefinition<
  FetchNotesQueryParam,
  NoteResult,
  SpaceTables.Annotations
>('fetchNotes', SpaceTables.Annotations, ({ select, where, param }) => {
  const params: FetchNotesQueryParam = {
    parentId: param('parentId') as string
  };
  select('createdAt');
  select('order');
  select('conflictId');
  where('parentId', params.parentId);
});

export default fetchNotesQuery;
