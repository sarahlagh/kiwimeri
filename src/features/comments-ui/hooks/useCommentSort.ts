import { CollectionItemDisplayOpts } from '@/collection/collection';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { CommentSort } from '@/domain/comments/model';
import { Id } from 'tinybase/common';

const useCommentSort = (rowId: Id): CommentSort => {
  const display_opts = useSpaceCell<'collection', 'display_opts'>(
    'collection',
    rowId,
    'display_opts',
    'space'
  );
  if (display_opts) {
    const opts = JSON.parse(display_opts) as CollectionItemDisplayOpts;
    if (opts.documentSort) {
      return opts.documentSort;
    }
  }
  // return default
  return { by: 'createdAt', descending: false };
};
export default useCommentSort;
