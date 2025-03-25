import { IonRouterOutlet } from '@ionic/react';
import { Redirect, Route } from 'react-router';
import {
  DEBUG_ROUTE,
  DOCUMENT_ROUTE,
  FOLDER_ROUTE,
  GET_FOLDER_ROUTE,
  SETTINGS_ROUTE
} from '../common/routes';
import { ROOT_FOLDER } from '../constants';
import DebugPage from './pages/DebugPage';
import DocumentExplorerPage from './pages/DocumentExplorerPage';
import DocumentListPage from './pages/DocumentListPage';
import SettingsPage from './pages/SettingsPage';

const AppRouterOutlet = () => (
  <IonRouterOutlet>
    <Route path={FOLDER_ROUTE} component={DocumentListPage} exact={true} />
    <Route
      path={DOCUMENT_ROUTE}
      component={DocumentExplorerPage}
      exact={true}
    />
    <Route path={SETTINGS_ROUTE} component={SettingsPage} />
    <Route path={DEBUG_ROUTE} component={DebugPage} />
    <Redirect exact from="/collection" to={GET_FOLDER_ROUTE(ROOT_FOLDER)} />
    <Redirect exact from="/" to={GET_FOLDER_ROUTE(ROOT_FOLDER)} />
  </IonRouterOutlet>
);

export default AppRouterOutlet;
