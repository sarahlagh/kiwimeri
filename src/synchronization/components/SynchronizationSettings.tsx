import platformService from '@/common/services/platform.service';
import OperationCard from '@/dev-tools/components/OperationsCard';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { LocalChangesCard } from '@/features/local-changes-ui';
import { ImportExportStoreSettings } from '@/features/settings-ui';
import RemotesSettings from './providers/RemotesSettings';

const SynchronizationSettings = () => {
  const syncEnabled = deviceSettings.isSyncEnabled();
  return (
    <>
      <RemotesSettings />
      {syncEnabled && <LocalChangesCard />}
      <ImportExportStoreSettings />
      {!platformService.isRelease() && <OperationCard />}
    </>
  );
};
export default SynchronizationSettings;
