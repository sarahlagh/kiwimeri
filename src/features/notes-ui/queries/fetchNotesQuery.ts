import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { DOC_ANNOTATION_TABLE } from '@/domain/document-annotations/model';
import { NoteResult } from '../model';

export type FetchNotesQueryParam = {
  itemId: string;
};

const fetchNotesQuery = new SpaceQueryDefinition<
  FetchNotesQueryParam,
  NoteResult,
  'document_annotation'
>('fetchNotes', DOC_ANNOTATION_TABLE, ({ select, where, param }) => {
  const params: FetchNotesQueryParam = {
    itemId: param('itemId') as string
  };
  select('createdAt');
  select('order');
  select('conflict');
  where('itemId', params.itemId);
});

export default fetchNotesQuery;
