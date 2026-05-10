import { APPICONS } from '@/constants';
import { Sort } from '@/shared/utils/sort-filter/sort';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { i18n } from '@lingui/core';
import { useLingui } from '@lingui/react/macro';
import { ReactNode } from 'react';
import GenericSearchInline, {
  GenericSearchInlineProps
} from './GenericSearchInline';

type SortProps<SortType> = {
  sortEnabled: true;
  sort: Sort<SortType>;
  onSortChange: (sort?: Sort<SortType>) => void;
  allowedSorts: readonly SortType[];
};

type GenericSortProps<SortType> =
  | {
      sortEnabled: false;
    }
  | SortProps<SortType>;

type SearchProps =
  | { searchEnabled: false }
  | ({
      searchEnabled: true;
    } & GenericSearchInlineProps);

export type GenericSortFilterProps<SortType> = GenericSortProps<SortType> &
  SearchProps &
  React.HTMLAttributes<HTMLIonToolbarElement> & {
    readonly children?: ReactNode;
  };

const valuesTransMap = new Map<string, string>();
valuesTransMap.set('created', i18n._('Creation Date'));
valuesTransMap.set('createdAt', i18n._(`Creation Date`));
valuesTransMap.set('updated', i18n._(`Last Updated`));
valuesTransMap.set('updatedAt', i18n._(`Last Updated`));
valuesTransMap.set('title', i18n._(`Title`));
valuesTransMap.set('preview', i18n._(`Content`));
valuesTransMap.set('order', i18n._(`Manual`));

const GenericSortFilter = <SortType,>(
  props: GenericSortFilterProps<SortType>
) => {
  const { t } = useLingui();
  const { sortEnabled, searchEnabled, children } = props;

  // TODO opt to keep folders at top
  return (
    <IonList class="inner-list">
      {sortEnabled && props.sort && (
        <IonItem className="inner-item-slim">
          <IonSelect
            style={{ marginLeft: 6 }}
            label={t`Sort`}
            value={props.sort.by}
            placeholder={valuesTransMap.get(props.sort.by as string)}
            onIonChange={e => {
              props.sort.by = e.detail.value;
              props.onSortChange(props.sort);
            }}
          >
            {props.allowedSorts.map(sort => (
              <IonSelectOption key={sort as string} value={sort}>
                {valuesTransMap.get(sort as string)}
              </IonSelectOption>
            ))}
          </IonSelect>

          {props.sort.by !== 'order' && (
            <IonButton
              slot="end"
              fill="clear"
              onClick={() => {
                props.sort.descending = !props.sort.descending;
                props.onSortChange(props.sort);
              }}
            >
              {props.sort.descending ? (
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
          <GenericSearchInline
            toggleSearchAutoFocus={props.toggleSearchAutoFocus}
            searchText={props.searchText || ''}
            onSearch={val => {
              props.onSearch(val);
            }}
          />
        </IonItem>
      )}
      {children}
    </IonList>
  );
};
export default GenericSortFilter;
