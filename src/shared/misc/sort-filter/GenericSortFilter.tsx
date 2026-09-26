import { APPICONS } from '@/constants';
import { Sort } from '@/shared/misc/sort-filter/sort';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { i18n, MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { ReactNode } from 'react';
import GenericSearchInline, {
  GenericSearchInlineProps
} from './GenericSearchInline';

type SortProps<SortType extends string> = {
  sortEnabled: true;
  sort: Sort<SortType>;
  onSortChange: (sort?: Sort<SortType>) => void;
  allowedSorts: readonly SortType[];
};

type GenericSortProps<SortType extends string> =
  | {
      sortEnabled: false;
    }
  | SortProps<SortType>;

type SearchProps =
  | { searchEnabled: false }
  | ({
      searchEnabled: true;
    } & GenericSearchInlineProps);

export type GenericSortFilterProps<SortType extends string> =
  GenericSortProps<SortType> &
    SearchProps &
    React.HTMLAttributes<HTMLIonToolbarElement> & {
      readonly children?: ReactNode;
    };

const valuesTransMap = new Map<string, MessageDescriptor>();
valuesTransMap.set('createdAt', msg`Creation Date`);
valuesTransMap.set('updatedAt', msg`Last Updated`);
valuesTransMap.set('title', msg`Title`);
valuesTransMap.set('previewText', msg`Content`);
valuesTransMap.set('order', msg`Manual`);

function getI18nValue<SortType extends string>(sort: SortType) {
  return valuesTransMap.has(sort) ? i18n._(valuesTransMap.get(sort)!) : sort;
}

const GenericSortFilter = <SortType extends string>(
  props: GenericSortFilterProps<SortType>
) => {
  const { t } = useLingui();
  const { sortEnabled, searchEnabled, children } = props;

  // TODO opt to keep folders at top
  return (
    <IonList className="inner-list">
      {sortEnabled && props.sort && (
        <IonItem className="inner-item-slim">
          <IonSelect
            style={{ marginLeft: 6 }}
            label={t`Sort`}
            value={props.sort.by}
            placeholder={getI18nValue(props.sort.by)}
            onIonChange={e => {
              props.sort.by = e.detail.value;
              props.onSortChange(props.sort);
            }}
          >
            {props.allowedSorts.map(sortBy => (
              <IonSelectOption key={sortBy as string} value={sortBy}>
                {getI18nValue(sortBy)}
              </IonSelectOption>
            ))}
          </IonSelect>

          {props.sort.by !== 'order' && (
            <IonButton
              aria-label={t`Sort direction`}
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
