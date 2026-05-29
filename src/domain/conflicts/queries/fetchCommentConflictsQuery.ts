import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { ParamValues } from 'tinybase/with-schemas';
import { CommentConflictResult } from '../model';

const fetchCommentConflictsQuery = new SpaceQueryDefinition<
  ParamValues,
  CommentConflictResult,
  'comments'
>('fetchCommentConflicts', 'comments', ({ select, where }) => {
  select('itemId');
  select('conflict');
  where(getCell => getCell('conflict') !== undefined);
});

export default fetchCommentConflictsQuery;
