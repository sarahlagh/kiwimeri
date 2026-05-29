import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { DOC_ANNOTATION_TABLE } from '@/domain/document-annotations/model';
import { CommentResult } from '../model';

export type FetchCommentsQueryParam = {
  itemId: string;
};

const fetchCommentsQuery = new SpaceQueryDefinition<
  FetchCommentsQueryParam,
  CommentResult,
  'document_annotation'
>('fetchComments', DOC_ANNOTATION_TABLE, ({ select, where, param }) => {
  const params: FetchCommentsQueryParam = {
    itemId: param('itemId') as string
  };
  select('createdAt');
  select('order');
  select('conflict');
  where('itemId', params.itemId);
});

export default fetchCommentsQuery;
