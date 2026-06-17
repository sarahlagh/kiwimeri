import usePref from '@/domain/user-preferences/hooks/usePref';
import { CollectionItemSortType, SpaceSettings } from '../model';

export default function useSpaceDefaultSettings(): SpaceSettings {
  const by = usePref<'defaultSortBy'>(
    'defaultSortBy'
  ) as CollectionItemSortType;
  const descending = usePref<'defaultSortDesc'>('defaultSortDesc');
  const statsEnabled = usePref<'statsEnabled'>('statsEnabled');
  return {
    statsEnabled: statsEnabled,
    sort: { by, descending }
  };
}
