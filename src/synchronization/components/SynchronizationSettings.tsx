import platformService from '@/common/services/platform.service';
import OperationCard from '@/dev-tools/components/OperationsCard';
import ImportExportStoreSettings from '@/settings/components/sections/ImportExportStoreSettings';
import LocalChangesCard from './LocalChangesCard';
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
