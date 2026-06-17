import EditConfigList, {
  ConfigRowType
} from '@/common/containers/EditConfigList';
import { AnySerializableData, SerializableData } from '@/db/types/store-types';
import {
  CollectionItemSortType,
  SpaceSettings
} from '@/domain/collection-settings/model';
import { useLingui } from '@lingui/react/macro';

type GenericCollectionSettingsProps = {
  defaultSettings: SpaceSettings;
  onDefaultSettingsChange: (newSettings: SpaceSettings) => void;
  withRows?: ConfigRowType[];
  withInitialState?: AnySerializableData;
  withOnChange?: (key: string, val: SerializableData) => void;
};

const GenericCollectionSettings = ({
  defaultSettings,
  onDefaultSettingsChange,
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
        sort_by: defaultSettings.sort.by,
        sort_descending: defaultSettings.sort.descending,
        stats_enabled: defaultSettings.statsEnabled,
        ...withInitialState
      }}
      onChange={(key, val) => {
        const newSettings = { ...defaultSettings };
        switch (key) {
          case 'sort_by':
            newSettings.sort.by = val as string as CollectionItemSortType;
            onDefaultSettingsChange(newSettings);
            break;
          case 'sort_descending':
            newSettings.sort.descending = val as boolean;
            onDefaultSettingsChange(newSettings);
            break;
          case 'stats_enabled':
            newSettings.statsEnabled = val as boolean;
            onDefaultSettingsChange(newSettings);
        }
        if (withOnChange) withOnChange(key, val);
      }}
    />
  );
};
export default GenericCollectionSettings;
