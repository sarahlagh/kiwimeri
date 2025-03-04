import { folderOutline, folderSharp } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';

import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';

import documentsService from '../db/documents.service';

interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

export const NoteList = () => {
  const notes: AppPage[] = documentsService.useDocuments().map(
    note =>
      ({
        title: note.title,
        url: `/explore/note/${note.id}`,
        iosIcon: folderOutline,
        mdIcon: folderSharp
      }) as AppPage
  );

  const location = useLocation();
  return (
    <IonList id="note-explorer-menu-list">
      {notes.map((note, index) => {
        return (
          <IonItem
            key={index}
            color={location.pathname === note.url ? 'primary' : ''}
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
