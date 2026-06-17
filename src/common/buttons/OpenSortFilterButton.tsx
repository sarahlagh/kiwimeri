import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import SortFilter from '@/collection/components/SortFilter';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { settingsService } from '@/domain/collection-settings/collection-settings.service';
import useFolderEffectiveSort from '@/domain/collection-settings/hooks/useFolderEffectiveSort';
import { CollectionItemSort } from '@/domain/collection-settings/model';
import { IonButton, IonIcon, useIonPopover } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';

type OpenSortFilterButtonProps = {
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
