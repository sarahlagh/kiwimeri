import { APPICONS } from '@/constants';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import {
  CollectionItemSort,
  CollectionItemSortType,
  sortBy
} from '../collection';

export type SortFilterProps = {
  currentSort: CollectionItemSort;
  onChange: (sort?: CollectionItemSort) => void;
  choices?: readonly CollectionItemSortType[];
} & React.HTMLAttributes<HTMLIonToolbarElement>;

const SortFilter = ({
  currentSort,
  onChange,
  choices = sortBy
}: SortFilterProps) => {
  const { t } = useLingui();
  const sort = { ...currentSort };

  const valuesTransMap = new Map<CollectionItemSortType, string>();
  valuesTransMap.set('created', 'Creation Date');
  valuesTransMap.set('updated', 'Last Updated');
  valuesTransMap.set('title', 'Title');
  valuesTransMap.set('preview', 'Content');
  valuesTransMap.set('order', 'Manual');
  // TODO opt to keep folders at top
  return (
    <IonList>
      <IonItem>
        <IonSelect
          label={t`Sort`}
          value={currentSort.by}
          placeholder={valuesTransMap.get(currentSort.by)}
          onIonChange={e => {
            sort.by = e.detail.value;
            onChange(sort);
          }}
        >
          {choices.map(sort => (
            <IonSelectOption key={sort} value={sort}>
              {valuesTransMap.get(sort)}
            </IonSelectOption>
          ))}
        </IonSelect>

        {sort.by !== 'order' && (
          <IonButton
            slot="end"
            fill="clear"
            onClick={() => {
              sort.descending = !currentSort.descending;
              onChange(sort);
            }}
          >
            {currentSort.descending ? (
              <IonIcon icon={APPICONS.moveDown}></IonIcon>
            ) : (
              <IonIcon icon={APPICONS.moveUp}></IonIcon>
            )}
          </IonButton>
        )}
      </IonItem>
    </IonList>
  );
};
export default SortFilter;
