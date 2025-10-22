import CurrentNotebookSettings from './sections/CurrentNotebookSettings';
import CurrentSpaceSettings from './sections/CurrentSpaceSettings';
import ImportExportCollectionSettings from './sections/ImportExportCollectionSettings';

const Settings = () => {
  return (
    <>
      <CurrentNotebookSettings />
      <CurrentSpaceSettings />
      <ImportExportCollectionSettings />
    </>
  );
};
export default Settings;
