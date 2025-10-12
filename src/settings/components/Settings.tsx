import CurrentNotebookSettings from './sections/CurrentNotebookSettings';
import CurrentSpaceSettings from './sections/CurrentSpaceSettings';
import ImportExportCollectionSettings from './sections/ImportExportCollectionSettings';
import ImportExportStoreSettings from './sections/ImportExportStoreSettings';

const Settings = () => {
  return (
    <>
      <CurrentNotebookSettings />
      <CurrentSpaceSettings />
      <ImportExportCollectionSettings />
      <ImportExportStoreSettings />
    </>
  );
};
export default Settings;
