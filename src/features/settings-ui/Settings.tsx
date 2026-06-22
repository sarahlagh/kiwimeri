import CurrentDeviceSettings from './components/CurrentDeviceSettings';
import CurrentNotebookSettings from './components/CurrentNotebookSettings';
import CurrentSpaceSettings from './components/CurrentSpaceSettings';

const Settings = () => {
  return (
    <>
      <CurrentNotebookSettings />
      <CurrentSpaceSettings />
      <CurrentDeviceSettings />
    </>
  );
};
export default Settings;
