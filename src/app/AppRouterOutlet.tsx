import { IonRouterOutlet } from '@ionic/react';
import { Redirect, Route } from 'react-router';
import { ROOT_FOLDER } from '../constants';
import DebugPage from './pages/DebugPage';
import DocumentExplorerPage from './pages/DocumentExplorerPage';
import DocumentListPage from './pages/DocumentListPage';
import SettingsPage from './pages/SettingsPage';

const AppRouterOutlet = () => (
  <IonRouterOutlet>
    <Route
      path="/collection/:parent"
      component={DocumentListPage}
      exact={true}
    />
    <Route
      path="/collection/:parent/document/:id"
      component={DocumentExplorerPage}
      exact={true}
    />
    <Route path="/settings" component={SettingsPage} />
    <Route path="/debug" component={DebugPage} />
    <Redirect exact from="/collection" to={`/collection/${ROOT_FOLDER}`} />
    <Redirect exact from="/" to={`/collection/${ROOT_FOLDER}`} />
  </IonRouterOutlet>
);

export default AppRouterOutlet;
