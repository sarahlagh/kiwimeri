import EditConfigList, {
  ConfigRowType
} from '@/common/containers/EditConfigList';
import { AnySerializableData, SerializableData } from '@/db/types/store-types';
import {
  CollectionItemSortType,
  NotebookDisplayOpts
} from '@/domain/collection-display-opts/model';
import { CollectionItemFlags } from '@/domain/collection-flags/model';
import { useLingui } from '@lingui/react/macro';

type GenericCollectionSettingsProps = {
  defaultSort: NotebookDisplayOpts['sort'];
  onDefaultSortChange: (newDefaultSort: NotebookDisplayOpts['sort']) => void;
  defaultFlags: Required<CollectionItemFlags>;
  onDefaultFlagsChange: (newDefaultFlags: CollectionItemFlags) => void;
  withRows?: ConfigRowType[];
  withInitialState?: AnySerializableData;
  withOnChange?: (key: string, val: SerializableData) => void;
};

const GenericCollectionSettings = ({
  defaultSort,
  defaultFlags,
  onDefaultSortChange,
  onDefaultFlagsChange,
  withRows = [],
  withInitialState = {},
  withOnChange
}: GenericCollectionSettingsProps) => {
  const { t } = useLingui();
  return (
    <EditConfigList
      rows={[
        {
          key: 'sort_by',
          label: t`Sort items by...`,
          type: 'enum',
          values: [
            { val: 'created', label: t`Creation Date` },
            { val: 'updated', label: t`Modified Date` },
            { val: 'order', label: t`Manual Order` }
          ] as { val: CollectionItemSortType; label: string }[]
        },
        {
          key: 'sort_descending',
          label: t`In descending order`,
          type: 'boolean',
          if: state => state.sort_by === 'order'
        },
        {
          key: 'stats_enabled',
          label: t`Track text statistics`,
          type: 'boolean'
        },
        ...withRows
      ]}
      initialState={{
        sort_by: defaultSort.by,
        sort_descending: defaultSort.descending,
        stats_enabled: defaultFlags.statsEnabled,
        ...withInitialState
      }}
      onChange={(key, val) => {
        const newSort = { ...defaultSort };
        const newFlags = { ...defaultFlags };
        switch (key) {
          case 'sort_by':
            newSort.by = val as string as CollectionItemSortType;
            onDefaultSortChange(newSort);
            break;
          case 'sort_descending':
            newSort.descending = val as boolean;
            onDefaultSortChange(newSort);
            break;
          case 'stats_enabled':
            newFlags.statsEnabled = val as boolean;
            onDefaultFlagsChange(newFlags);
        }
        if (withOnChange) withOnChange(key, val);
      }}
    />
  );
};
export default GenericCollectionSettings;
