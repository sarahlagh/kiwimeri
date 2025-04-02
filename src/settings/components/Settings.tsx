import ImportExportCollectionSettings from '../storage/ImportExportCollectionSettings';
import OperationSettings from '../storage/OperationsSettings';
const Settings = () => {
  return (
    <>
      {/* <FilesystemSyncSettings></FilesystemSyncSettings> */}
      <ImportExportCollectionSettings />
      <OperationSettings />
    </>
  );
};
export default Settings;
