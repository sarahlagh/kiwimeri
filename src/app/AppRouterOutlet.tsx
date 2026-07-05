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
import { lazy } from 'react';
import { Route, Routes } from 'react-router';

const CollectionListPage = lazy(() => import('./pages/CollectionListPage'));
const DocumentEditorPage = lazy(() => import('./pages/DocumentEditorPage'));
const VersionedItemPage = lazy(() => import('./pages/VersionedItemPage'));
const SynchronizationPage = lazy(() => import('./pages/SynchronizationPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DevToolsPage = lazy(() => import('./pages/DevToolsPage'));
const WritingSessionPage = lazy(() => import('./pages/WritingSessionPage'));

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
