import CurrentNotebookSettings from './sections/CurrentNotebookSettings';
import ImportExportCollectionSettings from './sections/ImportExportCollectionSettings';
import ImportExportStoreSettings from './sections/ImportExportStoreSettings';

const Settings = () => {
  return (
    <>
      <CurrentNotebookSettings />
      <ImportExportCollectionSettings />
      <ImportExportStoreSettings />
    </>
  );
};
export default Settings;
