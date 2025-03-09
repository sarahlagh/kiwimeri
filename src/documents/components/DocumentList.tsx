import { folderOutline, folderSharp } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';

import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';

import documentsService from '../../db/documents.service';

interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

export const DocumentList = () => {
  const documents: AppPage[] = documentsService.useDocuments().map(
    document =>
      ({
        title: document.title,
        url: `/collection/document/${document.id}`,
        iosIcon: folderOutline,
        mdIcon: folderSharp
      }) as AppPage
  );

  const location = useLocation();
  return (
    <IonList id="document-explorer-menu-list">
      {documents.map((document, index) => {
        return (
          <IonItem
            key={index}
            color={location.pathname === document.url ? 'primary' : ''}
            routerLink={document.url}
            routerDirection="none"
            lines="none"
            detail={false}
          >
            <IonIcon
              aria-hidden="true"
              slot="start"
              ios={document.iosIcon}
              md={document.mdIcon}
            />
            <IonLabel>{document.title}</IonLabel>
          </IonItem>
        );
      })}
    </IonList>
  );
};

export default DocumentList;
