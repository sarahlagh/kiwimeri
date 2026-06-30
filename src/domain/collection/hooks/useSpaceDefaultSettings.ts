import usePref from '@/domain/user-preferences/hooks/usePref';
import {
  CollectionItemSortType,
  SpaceSettings
} from '../../collection/collection-settings';

export default function useSpaceDefaultSettings(): SpaceSettings {
  const by = usePref<'defaultSortBy'>(
    'defaultSortBy'
  ) as CollectionItemSortType;
  const descending = usePref('defaultSortDesc');
  const statsEnabled = usePref('statsEnabled');
  return {
    statsEnabled: statsEnabled,
    sort: { by, descending }
  };
}
