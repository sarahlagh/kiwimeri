import {
  DEV_TOOLS_ROUTE,
  DOCUMENT_ROUTE,
  FOLDER_ROUTE,
  INIT_ROUTE,
  SETTINGS_ROUTE,
  SYNCHRONIZATION_ROUTE,
  VERSION_ROUTE,
  WRITING_SESSION_ROUTE
} from '@/app/routes';
import { Route, Routes } from 'react-router';
import CollectionListPage from './pages/CollectionListPage';
import DevToolsPage from './pages/DevToolsPage';
import DocumentEditorPage from './pages/DocumentEditorPage';
import SettingsPage from './pages/SettingsPage';
import SynchronizationPage from './pages/SynchronizationPage';
import VersionedItemPage from './pages/VersionedItemPage';
import WritingSessionPage from './pages/WritingSessionPage';

const AppRouterOutlet = () => (
  <Routes>
    <Route path={INIT_ROUTE} Component={CollectionListPage} />
    <Route path={FOLDER_ROUTE} Component={CollectionListPage} />
    <Route path={DOCUMENT_ROUTE} Component={DocumentEditorPage} />
    <Route path={VERSION_ROUTE} Component={VersionedItemPage} />
    <Route path={SYNCHRONIZATION_ROUTE} Component={SynchronizationPage} />
    <Route path={SETTINGS_ROUTE} Component={SettingsPage} />
    <Route path={DEV_TOOLS_ROUTE} Component={DevToolsPage} />
    <Route path={WRITING_SESSION_ROUTE} Component={WritingSessionPage} />
  </Routes>
);

export default AppRouterOutlet;
