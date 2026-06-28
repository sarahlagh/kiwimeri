import SortFilter from '@/collection/components/SortFilter';
import collectionService from '@/db/collection.service';
import { settingsService } from '@/domain/collection-settings/collection-settings.service';
import useFolderEffectiveSort from '@/domain/collection-settings/hooks/useFolderEffectiveSort';
import {
  CollectionItemSort,
  CollectionItemSortType
} from '@/domain/collection-settings/model';
import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/domain/collection/model';
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
  const choices = ['createdAt', 'updatedAt'];
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
          settingsService.setFolderSort(id, sort);
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
