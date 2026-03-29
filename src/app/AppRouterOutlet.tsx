import {
  DEV_TOOLS_ROUTE,
  DOCUMENT_ROUTE,
  FOLDER_ROUTE,
  SETTINGS_ROUTE,
  SYNCHRONIZATION_ROUTE,
  VERSION_ROUTE,
  WRITING_SESSION_ROUTE
} from '@/common/routes';
import { IonRouterOutlet } from '@ionic/react';
import { Redirect, Route } from 'react-router';
import CollectionListPage from './pages/CollectionListPage';
import DevToolsPage from './pages/DevToolsPage';
import DocumentEditorPage from './pages/DocumentEditorPage';
import SettingsPage from './pages/SettingsPage';
import SynchronizationPage from './pages/SynchronizationPage';
import VersionedItemPage from './pages/VersionedItemPage';
import WritingSessionPage from './pages/WritingSessionPage';

const AppRouterOutlet = () => (
  <IonRouterOutlet>
    <Route path={FOLDER_ROUTE} component={CollectionListPage} />
    <Route path={DOCUMENT_ROUTE} component={DocumentEditorPage} />
    <Route path={VERSION_ROUTE} component={VersionedItemPage} />
    <Route path={SYNCHRONIZATION_ROUTE} component={SynchronizationPage} />
    <Route path={SETTINGS_ROUTE} component={SettingsPage} />
    <Route path={DEV_TOOLS_ROUTE} component={DevToolsPage} />
    <Route path={WRITING_SESSION_ROUTE} component={WritingSessionPage} />
    <Redirect exact from="/" to={FOLDER_ROUTE} />
  </IonRouterOutlet>
);

export default AppRouterOutlet;
