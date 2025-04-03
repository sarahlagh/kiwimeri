import WebdavSettings from '../cloud/WebdavSettings';
import ImportExportCollectionSettings from '../storage/ImportExportCollectionSettings';
import OperationSettings from '../storage/OperationsSettings';
const Settings = () => {
  return (
    <>
      {/* <FilesystemSyncSettings></FilesystemSyncSettings> */}
      <ImportExportCollectionSettings />
      <OperationSettings />
      <WebdavSettings />
    </>
  );
};
export default Settings;
