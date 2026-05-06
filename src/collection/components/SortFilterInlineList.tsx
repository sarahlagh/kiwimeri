import {
  CollectionItemSort,
  CollectionItemSortType,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import SortFilter from '@/collection/components/SortFilter';
import collectionService from '@/db/collection.service';
import { Id } from 'tinybase/with-schemas';

type SortFilterInlineListProps = {
  id: Id;
  sortEnabled?: boolean;
  searchEnabled?: boolean;
  searchText?: string;
  onSearch?: (val: string) => void;
};

const buildChoices = (type: CollectionItemTypeValues) => {
  const choices = ['created', 'updated'];
  if (type === CollectionItemType.document) {
    choices.push('preview');
  } else {
    choices.push('title');
  }
  choices.push('order');
  return choices as CollectionItemSortType[];
};

const SortFilterInlineList = ({
  id,
  sortEnabled = true,
  searchEnabled = false,
  searchText,
  onSearch
}: SortFilterInlineListProps) => {
  const type = collectionService.getItemType(id);
  const choices = buildChoices(type);
  const displayOpts = collectionService.useItemEffectiveDisplayOpts(id);
  const sort = displayOpts.sort;

  return (
    <SortFilter
      currentSort={sort}
      choices={choices}
      sortEnabled={sortEnabled}
      onSortChange={(sort?: CollectionItemSort) => {
        if (sort) {
          collectionService.setItemDisplayOpts(id, {
            ...displayOpts,
            sort
          });
        }
      }}
      searchEnabled={searchEnabled}
      searchText={searchText}
      onSearch={onSearch}
    />
  );
};
export default SortFilterInlineList;
