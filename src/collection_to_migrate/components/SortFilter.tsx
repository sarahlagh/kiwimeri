import { APPICONS } from '@/constants';
import {
  CollectionItemSort,
  CollectionItemSortType,
  docSortBy
} from '@/domain/collection/collection-settings';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { ReactNode } from 'react';
import SearchActionsToolbarLite from './SearchActionsToolbarLite';

export type SortFilterProps = {
  currentSort: CollectionItemSort;
  onSortChange: (sort?: CollectionItemSort) => void;
  choices?: readonly CollectionItemSortType[];
  sortEnabled?: boolean;
  searchEnabled?: boolean;
  searchText?: string;
  onSearch?: (val: string) => void;
  toggleSearchAutoFocus?: boolean;
} & React.HTMLAttributes<HTMLIonToolbarElement> & {
    readonly children?: ReactNode;
  };

const SortFilter = ({
  currentSort,
  onSortChange,
  choices = docSortBy,
  sortEnabled,
  searchEnabled,
  searchText,
  onSearch,
  toggleSearchAutoFocus,
  children
}: SortFilterProps) => {
  const { t } = useLingui();
  const sort = { ...currentSort };

  const valuesTransMap = new Map<CollectionItemSortType, string>();
  valuesTransMap.set('createdAt', t`Creation Date`);
  valuesTransMap.set('updatedAt', t`Last Updated`);
  valuesTransMap.set('title', t`Title`);
  valuesTransMap.set('preview', t`Content`);
  valuesTransMap.set('order', t`Manual`);
  // TODO opt to keep folders at top
  return (
    <IonList class="inner-list">
      {sortEnabled && (
        <IonItem className="inner-item-slim">
          <IonSelect
            style={{ marginLeft: 6 }}
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
      )}
      {searchEnabled && (
        <IonItem className="inner-item-slim">
          <SearchActionsToolbarLite
            toggleSearchAutoFocus={toggleSearchAutoFocus}
            searchText={searchText || ''}
            onValue={val => {
              if (onSearch) onSearch(val);
            }}
          />
        </IonItem>
      )}
      {children}
    </IonList>
  );
};
export default SortFilter;
