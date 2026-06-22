import { plt } from '@/core/infra/platform';
import OperationCard from '@/dev-tools/components/OperationsCard';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
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
      {!plt.isRelease() && <OperationCard />}
    </>
  );
};
export default SynchronizationSettings;
