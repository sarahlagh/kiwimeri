import {
  CollectionItemSort,
  CollectionItemSortType,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import SortFilter from '@/collection/components/SortFilter';
import collectionService from '@/db/collection.service';
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
  const display_opts = collectionService.useFolderEffectiveDisplayOpts(id);
  const sort = display_opts.sort;

  return (
    <SortFilter
      toggleSearchAutoFocus={false}
      currentSort={sort}
      choices={choices}
      sortEnabled={sortEnabled}
      onSortChange={(sort?: CollectionItemSort) => {
        if (sort) {
          collectionService.setFolderDisplayOpts(id, {
            ...display_opts,
            sort
          });
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
