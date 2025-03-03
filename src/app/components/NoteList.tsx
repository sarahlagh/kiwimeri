// import './NoteList.css';

import { folderOutline, folderSharp } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';

import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';

interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

const notes: AppPage[] = [
  {
    title: 'Test Note 1',
    url: '/explore/note/1',
    iosIcon: folderOutline,
    mdIcon: folderSharp
  },
  {
    title: 'Test Note 2',
    url: '/explore/note/testid2',
    iosIcon: folderOutline,
    mdIcon: folderSharp
  }
];

export const NoteList: React.FC = () => {
  const location = useLocation();
  return (
    <IonList id="note-explorer-menu-list">
      {notes.map((note, index) => {
        return (
          <IonItem
            key={index}
            className={location.pathname === note.url ? 'selected' : ''}
            routerLink={note.url}
            routerDirection="none"
            lines="none"
            detail={false}
          >
            <IonIcon
              aria-hidden="true"
              slot="start"
              ios={note.iosIcon}
              md={note.mdIcon}
            />
            <IonLabel>{note.title}</IonLabel>
          </IonItem>
        );
      })}
    </IonList>
  );
};

export default NoteList;
