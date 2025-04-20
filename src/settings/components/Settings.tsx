import { appConfig } from '@/config';
import RemotesSettings from './providers/RemotesSettings';
import ImportExportCollectionSettings from './sections/ImportExportCollectionSettings';
import ImportExportStoreSettings from './sections/ImportExportStoreSettings';
import OperationSettings from './sections/OperationsSettings';

const Settings = () => {
  return (
    <>
      <RemotesSettings />
      <ImportExportCollectionSettings />
      <ImportExportStoreSettings />
      {!appConfig.IS_RELEASE && <OperationSettings />}
    </>
  );
};
export default Settings;
