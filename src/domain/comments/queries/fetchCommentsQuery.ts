import { SpaceQueryDefinition } from '../../../core/db/queries-helper';
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
  select('updatedAt');
  select('plainText');
  select('order');
  where('itemId', params.itemId);
});

export type FetchCommentsQuery = typeof fetchCommentsQuery;
export default fetchCommentsQuery;
