import { CollectionItemSort } from '@/collection/collection';
import SortFilter from '@/collection/components/SortFilter';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { IonButton, IonIcon, useIonPopover } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';

type OpenSortFilterButtonProps = {
  id: Id;
};

const OpenSortFilterButton = ({ id }: OpenSortFilterButtonProps) => {
  const displayOpts = collectionService.useItemDisplayOpts(id);
  const sort: CollectionItemSort = displayOpts.sort || {
    by: 'created',
    descending: false
  };
  const [present] = useIonPopover(SortFilter, {
    currentSort: sort,
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
