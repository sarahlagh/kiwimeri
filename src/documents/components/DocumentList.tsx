import {
  add,
  albums,
  chevronBack,
  documentTextOutline,
  ellipsisVertical,
  folderSharp,
  home
} from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonToolbar,
  useIonViewDidEnter
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { GET_DOCUMENT_ROUTE, GET_FOLDER_ROUTE } from '../../common/routes';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import userSettingsService from '../../db/user-settings.service';
import { DocumentNodeType, DocumentNodeTypeValues } from '../document';
import DocumentActionsToolbar from './DocumentActionsToolbar';
import FolderActionsToolbar from './FolderActionsToolbar';

interface DocumentNodeItem {
  id: string;
  type: DocumentNodeTypeValues;
  url: string;
  mdIcon: string;
  title: string;
}

interface DocumentListProps {
  parent: string;
}

export const DocumentList = ({ parent: folder }: DocumentListProps) => {
  const location = useLocation();
  const history = useHistory();
  const currentFolder = documentsService.useDocumentNode(folder);
  const [selectedNode, setSelectedNode] = useState<DocumentNodeItem | null>(
    null
  );

  useEffect(() => {
    documentsService.generateFetchAllDocumentNodesQuery(folder);
  }, [folder]);

  const documents: DocumentNodeItem[] = documentsService
    .useDocumentNodes(folder)
    .map(
      document =>
        ({
          id: document.id,
          type: document.type,
          title: document.title,
          url:
            document.type === DocumentNodeType.document
              ? GET_DOCUMENT_ROUTE(document.parent, document.id!)
              : GET_FOLDER_ROUTE(document.id!),
          mdIcon:
            document.type === DocumentNodeType.document
              ? documentTextOutline
              : folderSharp
        }) as DocumentNodeItem
    );

  useIonViewDidEnter(() => {
    userSettingsService.setCurrentFolder(folder);
  });

  return (
    <>
      <IonContent>
        <IonList id="document-explorer-menu-list">
          {documents.map(document => {
            return (
              <IonItem
                key={document.id}
                color={location.pathname === document.url ? 'primary' : ''}
                routerLink={document.url}
                routerDirection="none"
                lines="none"
                detail={false}
              >
                <IonIcon
                  aria-hidden="true"
                  slot="start"
                  ios={document.mdIcon}
                  md={document.mdIcon}
                />
                <IonButton
                  slot="end"
                  fill="clear"
                  color="medium"
                  onClick={e => {
                    console.log('clicked');
                    setSelectedNode(document);
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <IonIcon aria-hidden="true" icon={ellipsisVertical} />
                </IonButton>
                <IonLabel>{document.title}</IonLabel>
              </IonItem>
            );
          })}
        </IonList>
      </IonContent>
      <IonFooter>
        {selectedNode?.type === DocumentNodeType.folder && (
          <FolderActionsToolbar
            id={selectedNode.id}
            title={selectedNode.title}
            rows={2}
            onClose={() => setSelectedNode(null)}
          />
        )}
        {selectedNode?.type === DocumentNodeType.document && (
          <DocumentActionsToolbar
            id={selectedNode.id}
            title={selectedNode.title}
            rows={2}
            onClose={() => setSelectedNode(null)}
          />
        )}
        {!selectedNode && (
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton
                disabled={folder === ROOT_FOLDER}
                onClick={() => {
                  history.push(GET_FOLDER_ROUTE(ROOT_FOLDER));
                }}
              >
                <IonIcon icon={home}></IonIcon>
              </IonButton>
              <IonButton
                disabled={folder === ROOT_FOLDER}
                onClick={() => {
                  history.push(GET_FOLDER_ROUTE(currentFolder.parent));
                }}
              >
                <IonIcon icon={chevronBack}></IonIcon>
              </IonButton>
            </IonButtons>

            <IonButtons slot="end">
              <IonButton
                onClick={() => {
                  documentsService.addFolder(folder);
                }}
              >
                <IonIcon aria-hidden="true" ios={albums} md={albums} />
              </IonButton>
              <IonButton
                onClick={() => {
                  documentsService.addDocument(folder);
                }}
              >
                <IonIcon aria-hidden="true" ios={add} md={add} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        )}
      </IonFooter>
    </>
  );
};

export default DocumentList;
