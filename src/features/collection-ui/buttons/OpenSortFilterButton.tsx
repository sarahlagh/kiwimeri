import { APPICONS } from '@/constants';
import collectionService from '@/db_to_migrate/collection.service';
import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/domain/collection/collection';
import { CollectionItemSort } from '@/domain/collection/collection-settings';
import { settingsService } from '@/domain/collection/collection-settings.service';
import useFolderEffectiveSort from '@/domain/collection/hooks/useFolderEffectiveSort';
import { IonButton, IonIcon, useIonPopover } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';
import SortFilter from '../components/SortFilter';

type OpenSortFilterButtonProps = {
  id: Id;
  sortEnabled?: boolean;
  searchEnabled?: boolean;
  searchText?: string;
  onSearch?: (val: string) => void;
};

const buildChoices = (type: CollectionItemTypeValues) => {
  const choices = ['createdAt', 'updatedAt'];
  if (type === CollectionItemType.document) {
    choices.push('preview');
  } else {
    choices.push('title');
  }
  choices.push('order');
  return choices;
};

const OpenSortFilterButton = ({
  id,
  sortEnabled = true,
  searchEnabled = false,
  searchText,
  onSearch
}: OpenSortFilterButtonProps) => {
  const type = collectionService.getItemType(id);
  const choices = buildChoices(type);
  const sort = useFolderEffectiveSort(id);

  const [present] = useIonPopover(SortFilter, {
    currentSort: sort,
    choices,
    sortEnabled,
    searchEnabled,
    searchText,
    onSearch,
    onSortChange: (sort?: CollectionItemSort) => {
      if (sort) {
        settingsService.setFolderSort(id, sort);
      }
    }
  });

  return (
    <IonButton
      fill="clear"
      style={{ margin: '0' }}
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        present({ event: e.nativeEvent, alignment: 'end' });
      }}
    >
      <IonIcon icon={APPICONS.sortFilter}></IonIcon>
    </IonButton>
  );
};
export default OpenSortFilterButton;
