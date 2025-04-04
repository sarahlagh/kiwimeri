import PCloudSettings from './cloud/PCloudSettings';
import ImportExportCollectionSettings from './storage/ImportExportCollectionSettings';
import OperationSettings from './storage/OperationsSettings';
const Settings = () => {
  return (
    <>
      {/* <FilesystemSyncSettings></FilesystemSyncSettings> */}
      <ImportExportCollectionSettings />
      <OperationSettings />
      <PCloudSettings />
    </>
  );
};
export default Settings;
