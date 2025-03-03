import { IonRouterOutlet } from '@ionic/react';
import { Redirect, Route } from 'react-router';
import NotesExplorerPage from './pages/NotesExplorerPage';
import OtherPage from './pages/OtherPage';

const AppRouterOutlet: React.FC = () => (
  <IonRouterOutlet>
    <Route path="/explore" component={NotesExplorerPage} />
    <Route path="/explore/note/:id" component={NotesExplorerPage} />
    <Route path="/other" component={OtherPage} />
    <Redirect exact from="/" to="/explore" />
  </IonRouterOutlet>
);

export default AppRouterOutlet;
