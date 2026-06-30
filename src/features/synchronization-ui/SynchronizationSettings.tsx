import { plt } from '@/core/infra/platform';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { OperationsCard } from '@/features/dev-tools';
import { LocalChangesCard } from '@/features/local-changes-ui';

import {
  ImportExportCollectionSettings,
  ImportExportStoreSettings
} from '@/features/import-export';
import RemotesSettings from './components/RemotesSettings';

const SynchronizationSettings = () => {
  const syncEnabled = deviceSettings.isSyncEnabled();
  return (
    <>
      <RemotesSettings />
      {syncEnabled && <LocalChangesCard />}
      <ImportExportStoreSettings />
      <ImportExportCollectionSettings />
      {!plt.isRelease() && <OperationsCard />}
    </>
  );
};
export default SynchronizationSettings;
