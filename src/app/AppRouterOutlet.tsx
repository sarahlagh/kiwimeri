import { IonRouterOutlet } from '@ionic/react';
import { Redirect, Route } from 'react-router';
import NotesExplorerPage from './pages/NotesExplorerPage';
import NotesListPage from './pages/NotesListPage';
import OtherPage from './pages/OtherPage';

const AppRouterOutlet: React.FC = () => (
  <IonRouterOutlet>
    <Route path="/explore" component={NotesListPage} exact={true} />
    <Route path="/explore/note/:id" component={NotesExplorerPage} />
    <Route path="/other" component={OtherPage} />
    <Redirect exact from="/" to="/explore" />
  </IonRouterOutlet>
);

export default AppRouterOutlet;
