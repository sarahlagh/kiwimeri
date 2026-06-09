import usePref from '@/domain/user-preferences/hooks/usePref';
import { CollectionItemSortType, NotebookDisplayOpts } from '../model';

export default function useSpaceDefaultSort(): NotebookDisplayOpts['sort'] {
  const by = usePref<'defaultSortBy'>(
    'defaultSortBy'
  ) as CollectionItemSortType;
  const descending = usePref<'defaultSortDesc'>('defaultSortDesc');
  return {
    by,
    descending
  };
}
