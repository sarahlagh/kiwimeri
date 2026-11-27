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
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { ReactNode } from 'react';
import { defineI18nMap } from '../i18n-utils';
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

const sortLabels = defineI18nMap([
  ['createdAt', msg`Creation Date`],
  ['updatedAt', msg`Last Updated`],
  ['title', msg`Title`],
  ['previewText', msg`Content`],
  ['order', msg`Manual`]
]);

const GenericSortFilter = <SortType extends string>(
  props: GenericSortFilterProps<SortType>
) => {
  const { t, i18n } = useLingui();
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
            placeholder={sortLabels.get(i18n, props.sort.by)}
            onIonChange={e => {
              const newSort = { ...props.sort };
              newSort.by = e.detail.value;
              props.onSortChange(newSort);
            }}
          >
            {props.allowedSorts.map(sortBy => (
              <IonSelectOption key={sortBy as string} value={sortBy}>
                {sortLabels.get(i18n, sortBy)}
              </IonSelectOption>
            ))}
          </IonSelect>

          {props.sort.by !== 'order' && (
            <IonButton
              aria-label={t`Sort direction`}
              slot="end"
              fill="clear"
              onClick={() => {
                const newSort = { ...props.sort };
                newSort.descending = !newSort.descending;
                props.onSortChange(newSort);
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
