import { APPICONS } from '@/constants';
import {
  CollectionItemSort,
  CollectionItemSortType,
  docSortBy
} from '@/domain/collection/collection-settings';
import { SearchActionsToolbarLite } from '@/features/search';
import { defineI18nMap } from '@/shared/misc/i18n-utils';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { ReactNode } from 'react';

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

const sortLabels = defineI18nMap<CollectionItemSortType>([
  ['createdAt', msg`Creation Date`],
  ['lastActivityAt', msg`Last Updated`],
  ['title', msg`Title`],
  ['previewText', msg`Content`],
  ['order', msg`Manual`]
]);

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
  const { t, i18n } = useLingui();
  const sort = { ...currentSort };

  // TODO opt to keep folders at top
  return (
    <IonList className="inner-list">
      {sortEnabled && (
        <IonItem className="inner-item-slim">
          <IonSelect
            style={{ marginLeft: 6 }}
            label={t`Sort`}
            value={sort.by}
            placeholder={sortLabels.get(i18n, sort.by)}
            onIonChange={e => {
              const newSort = { ...sort };
              newSort.by = e.detail.value;
              onSortChange(newSort);
            }}
          >
            {choices.map(sort => (
              <IonSelectOption key={sort} value={sort}>
                {sortLabels.get(i18n, sort)}
              </IonSelectOption>
            ))}
          </IonSelect>

          {sort.by !== 'order' && (
            <IonButton
              slot="end"
              fill="clear"
              onClick={() => {
                const newSort = { ...sort };
                newSort.descending = !sort.descending;
                onSortChange(newSort);
              }}
            >
              {sort.descending ? (
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
