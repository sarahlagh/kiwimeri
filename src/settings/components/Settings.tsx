import PCloudSettings from './cloud/PCloudSettings';
import ImportExportCollectionSettings from './storage/ImportExportCollectionSettings';
import OperationSettings from './storage/OperationsSettings';
const Settings = () => {
  return (
    <>
      {/* <FilesystemSyncSettings></FilesystemSyncSettings> */}
      <ImportExportCollectionSettings />
      <PCloudSettings />
      <OperationSettings />
    </>
  );
};
export default Settings;
