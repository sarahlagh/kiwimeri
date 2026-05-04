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
import SearchActionsToolbarLite from './SearchActionsToolbarLite';

export type SortFilterProps = {
  currentSort: CollectionItemSort;
  onSortChange: (sort?: CollectionItemSort) => void;
  choices?: readonly CollectionItemSortType[];
  searchEnabled?: boolean;
  searchText?: string;
  onSearch?: (val: string) => void;
} & React.HTMLAttributes<HTMLIonToolbarElement>;

const SortFilter = ({
  currentSort,
  onSortChange,
  choices = sortBy,
  searchEnabled,
  searchText,
  onSearch
}: SortFilterProps) => {
  const { t } = useLingui();
  const sort = { ...currentSort };

  const valuesTransMap = new Map<CollectionItemSortType, string>();
  valuesTransMap.set('created', t`Creation Date`);
  valuesTransMap.set('updated', t`Last Updated`);
  valuesTransMap.set('title', t`Title`);
  valuesTransMap.set('preview', t`Content`);
  valuesTransMap.set('order', t`Manual`);
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
            onSortChange(sort);
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
              onSortChange(sort);
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
      {searchEnabled && (
        <IonItem>
          <SearchActionsToolbarLite
            searchText={searchText || ''}
            onValue={val => {
              if (onSearch) onSearch(val);
            }}
          />
        </IonItem>
      )}
    </IonList>
  );
};
export default SortFilter;
