import platformService from '@/common/services/platform.service';
import LocalChangesCard from './LocalChangesCard';
import RemotesSettings from './providers/RemotesSettings';

const SynchronizationSettings = () => {
  const syncEnabled = platformService.isSyncEnabled();
  return (
    <>
      <RemotesSettings />
      {syncEnabled && <LocalChangesCard />}
    </>
  );
};
export default SynchronizationSettings;
