import {
  CollectionItemDisplayOpts,
  CollectionItemSortType
} from '@/collection/collection';
import EditConfigList from '@/common/containers/EditConfigList';
import { useLingui } from '@lingui/react/macro';

type GenericCollectionSettingsProps = {
  defaultDisplayOpts: CollectionItemDisplayOpts;
  onDefaultDisplayOptsChange: (
    newDfaultDisplayOpts: CollectionItemDisplayOpts
  ) => void;
};

const GenericCollectionSettings = ({
  defaultDisplayOpts,
  onDefaultDisplayOptsChange
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
          type: 'boolean'
        }
      ]}
      initialState={{
        sort_by: defaultDisplayOpts.sort.by,
        sort_descending: defaultDisplayOpts.sort.descending
      }}
      onChange={(key, val) => {
        const newDisplayOpts = { ...defaultDisplayOpts };
        switch (key) {
          case 'sort_by':
            newDisplayOpts.sort.by = val as string as CollectionItemSortType;
            onDefaultDisplayOptsChange(newDisplayOpts);
            break;
          case 'sort_descending':
            newDisplayOpts.sort.descending = val as boolean;
            onDefaultDisplayOptsChange(newDisplayOpts);
            break;
        }
      }}
    />
  );
};
export default GenericCollectionSettings;
