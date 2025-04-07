import PCloudSettings from './cloud/PCloudSettings';
import ImportExportCollectionSettings from './storage/ImportExportCollectionSettings';
import ImportExportStoreSettings from './storage/ImportExportStoreSettings';
import OperationSettings from './storage/OperationsSettings';
const Settings = () => {
  return (
    <>
      {/* <FilesystemSyncSettings></FilesystemSyncSettings> */}
      <ImportExportCollectionSettings />
      <PCloudSettings />
      <ImportExportStoreSettings />
      <OperationSettings />
    </>
  );
};
export default Settings;
