import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-schema';
import { NoteResult } from '../model';

export type FetchNotesQueryParam = {
  itemId: string;
};

const fetchNotesQuery = new SpaceQueryDefinition<
  FetchNotesQueryParam,
  NoteResult,
  'document_annotation'
>('fetchNotes', SpaceTables.Annotations, ({ select, where, param }) => {
  const params: FetchNotesQueryParam = {
    itemId: param('itemId') as string
  };
  select('createdAt');
  select('order');
  select('conflict');
  where('itemId', params.itemId);
});

export default fetchNotesQuery;
