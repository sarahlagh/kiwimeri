import CurrentDeviceSettings from './components/CurrentDeviceSettings';
import CurrentNotebookSettings from './components/CurrentNotebookSettings';
import CurrentSpaceSettings from './components/CurrentSpaceSettings';
import ImportExportCollectionSettings from './components/ImportExportCollectionSettings';

const Settings = () => {
  return (
    <>
      <CurrentNotebookSettings />
      <CurrentSpaceSettings />
      <CurrentDeviceSettings />
      <ImportExportCollectionSettings />
    </>
  );
};
export default Settings;
