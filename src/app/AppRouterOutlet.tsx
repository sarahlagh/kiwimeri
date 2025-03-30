import { IonRouterOutlet } from '@ionic/react';
import { Redirect, Route } from 'react-router';
import {
  DEBUG_ROUTE,
  DOCUMENT_ROUTE,
  FOLDER_ROUTE,
  SETTINGS_ROUTE
} from '../common/routes';
import DebugPage from './pages/DebugPage';
import DocumentEditorPage from './pages/DocumentEditorPage';
import DocumentListPage from './pages/DocumentListPage';
import SettingsPage from './pages/SettingsPage';

const AppRouterOutlet = () => (
  <IonRouterOutlet>
    <Route path={FOLDER_ROUTE}>
      <DocumentListPage />
    </Route>
    <Route path={DOCUMENT_ROUTE}>
      <DocumentEditorPage />
    </Route>
    <Route path={SETTINGS_ROUTE} component={SettingsPage} />
    <Route path={DEBUG_ROUTE} component={DebugPage} />
    <Redirect exact from="/" to={FOLDER_ROUTE} />
  </IonRouterOutlet>
);

export default AppRouterOutlet;
