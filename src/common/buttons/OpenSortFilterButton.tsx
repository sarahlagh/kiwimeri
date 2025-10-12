import {
  CollectionItemSort,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import SortFilter from '@/collection/components/SortFilter';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { IonButton, IonIcon, useIonPopover } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';

type OpenSortFilterButtonProps = {
  id: Id;
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

const OpenSortFilterButton = ({ id }: OpenSortFilterButtonProps) => {
  const type = collectionService.getItemType(id);
  const choices = buildChoices(type);

  const displayOpts = collectionService.useItemDisplayOpts(id);
  const sort: CollectionItemSort = displayOpts.sort || {
    by: 'created',
    descending: false
  };
  const [present] = useIonPopover(SortFilter, {
    currentSort: sort,
    choices,
    onChange: (sort?: CollectionItemSort) => {
      if (sort) {
        collectionService.setItemDisplayOpts(id, { ...displayOpts, sort });
      }
    }
  });

  return (
    <IonButton
      fill="clear"
      slot="end"
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
