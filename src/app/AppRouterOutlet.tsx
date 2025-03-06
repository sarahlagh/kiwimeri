import { IonRouterOutlet } from '@ionic/react';
import { Redirect, Route } from 'react-router';
import DebugPage from './pages/DebugPage';
import DocumentExplorerPage from './pages/DocumentExplorerPage';
import DocumentListPage from './pages/DocumentListPage';
import SettingsPage from './pages/SettingsPage';

const AppRouterOutlet = () => (
  <IonRouterOutlet>
    <Route path="/explore" component={DocumentListPage} exact={true} />
    <Route path="/explore/document/:id" component={DocumentExplorerPage} />
    <Route path="/settings" component={SettingsPage} />
    <Route path="/debug" component={DebugPage} />
    <Redirect exact from="/" to="/explore" />
  </IonRouterOutlet>
);

export default AppRouterOutlet;
