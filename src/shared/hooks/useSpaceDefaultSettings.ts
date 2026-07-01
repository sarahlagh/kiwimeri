import {
  CollectionItemSortType,
  SpaceSettings
} from '@/domain/collection/collection-settings';
import usePref from '@/shared/hooks/usePref';

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
