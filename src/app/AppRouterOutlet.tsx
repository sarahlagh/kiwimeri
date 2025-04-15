import {
  DEBUG_ROUTE,
  DOCUMENT_ROUTE,
  FOLDER_ROUTE,
  SETTINGS_ROUTE
} from '@/common/routes';
import { IonRouterOutlet } from '@ionic/react';
import { Redirect, Route } from 'react-router';
import CollectionListPage from './pages/CollectionListPage';
import DebugPage from './pages/DebugPage';
import DocumentEditorPage from './pages/DocumentEditorPage';
import SettingsPage from './pages/SettingsPage';

const AppRouterOutlet = () => (
  <IonRouterOutlet>
    <Route path={FOLDER_ROUTE}>
      <CollectionListPage />
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
