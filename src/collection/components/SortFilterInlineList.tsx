import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import SortFilter from '@/collection/components/SortFilter';
import collectionService from '@/db/collection.service';
import { displayOptsService } from '@/domain/collection-display-opts/display-opts.service';
import useFolderEffectiveSort from '@/domain/collection-display-opts/hooks/useFolderEffectiveSort';
import {
  CollectionItemSort,
  CollectionItemSortType
} from '@/domain/collection-display-opts/model';
import { ReactNode } from 'react';
import { Id } from 'tinybase/with-schemas';

type SortFilterInlineListProps = {
  id: Id;
  sortEnabled?: boolean;
  searchEnabled?: boolean;
  searchText?: string;
  onSearch?: (val: string) => void;
} & {
  readonly children?: ReactNode;
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
  onSearch,
  children
}: SortFilterInlineListProps) => {
  const type = collectionService.getItemType(id);
  const choices = buildChoices(type);
  const sort = useFolderEffectiveSort(id);

  return (
    <SortFilter
      toggleSearchAutoFocus={false}
      currentSort={sort}
      choices={choices}
      sortEnabled={sortEnabled}
      onSortChange={(sort?: CollectionItemSort) => {
        if (sort) {
          displayOptsService.setFolderSort(id, sort);
        }
      }}
      searchEnabled={searchEnabled}
      searchText={searchText}
      onSearch={onSearch}
    >
      {children}
    </SortFilter>
  );
};
export default SortFilterInlineList;
