import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { CommentResult } from '../model';

export type FetchCommentsQueryParam = {
  itemId: string;
};

const fetchCommentsQuery = new SpaceQueryDefinition<
  FetchCommentsQueryParam,
  CommentResult,
  'comments'
>('fetchComments', 'comments', ({ select, where, param }) => {
  const params: FetchCommentsQueryParam = {
    itemId: param('itemId') as string
  };
  select('createdAt');
  select('order');
  select('conflict');
  where('itemId', params.itemId);
});

export default fetchCommentsQuery;
