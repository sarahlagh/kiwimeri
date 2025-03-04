import { IonRouterOutlet } from '@ionic/react';
import { Redirect, Route } from 'react-router';
import DocumentExplorerPage from './pages/DocumentExplorerPage';
import DocumentListPage from './pages/DocumentListPage';
import OtherPage from './pages/OtherPage';

const AppRouterOutlet = () => (
  <IonRouterOutlet>
    <Route path="/explore" component={DocumentListPage} exact={true} />
    <Route path="/explore/document/:id" component={DocumentExplorerPage} />
    <Route path="/other" component={OtherPage} />
    <Redirect exact from="/" to="/explore" />
  </IonRouterOutlet>
);

export default AppRouterOutlet;
