import CurrentDeviceSettings from './components/CurrentDeviceSettings';
import CurrentNotebookSettings from './components/CurrentNotebookSettings';
import CurrentSpaceSettings from './components/CurrentSpaceSettings';
import ProfileSwitcherSettings from './components/ProfileSwitcherSettings';

const Settings = () => {
  return (
    <>
      <CurrentNotebookSettings />
      <CurrentSpaceSettings />
      <CurrentDeviceSettings />
      <ProfileSwitcherSettings />
    </>
  );
};
export default Settings;
