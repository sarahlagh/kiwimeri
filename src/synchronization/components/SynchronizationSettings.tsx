import LocalChangesCard from './LocalChangesCard';
import RemotesSettings from './providers/RemotesSettings';

const SynchronizationSettings = () => {
  return (
    <>
      <RemotesSettings />
      <LocalChangesCard />
    </>
  );
};
export default SynchronizationSettings;
