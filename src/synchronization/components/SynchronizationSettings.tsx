import platformService from '@/common/services/platform.service';
import OperationCard from '@/dev-tools/components/OperationsCard';
import { LocalChangesCard } from '@/features/local-changes-ui';
import { ImportExportStoreSettings } from '@/features/settings-ui';
import RemotesSettings from './providers/RemotesSettings';

const SynchronizationSettings = () => {
  const syncEnabled = platformService.isSyncEnabled();
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
