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
  IonToolbar
} from '@ionic/react';

import React, { useEffect, useState } from 'react';
import { GET_DOCUMENT_ROUTE, GET_FOLDER_ROUTE } from '../../common/routes';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import userSettingsService from '../../db/user-settings.service';
import { DocumentNodeResult, DocumentNodeType } from '../document';
import DocumentActionsToolbar from './DocumentActionsToolbar';
import FolderActionsToolbar from './FolderActionsToolbar';

interface DocumentListProps {
  parent: string;
}

type SetSelectedNodeType = React.Dispatch<
  React.SetStateAction<DocumentNodeResult | null>
>;
// type ModalPresentType = (
//   options?: Omit<ModalOptions, 'component' | 'componentProps'> &
//     HookOverlayOptions
// ) => void;

const DocumentListNodeItem = ({
  document,
  setSelectedNode
  // present
}: {
  document: DocumentNodeResult;
  setSelectedNode: SetSelectedNodeType;
  // present: ModalPresentType;
}) => {
  const location = useLocation();
  const url =
    document.type === DocumentNodeType.document
      ? GET_DOCUMENT_ROUTE(document.parent, document.id)
      : GET_FOLDER_ROUTE(document.id);
  const icon =
    document.type === DocumentNodeType.document
      ? documentTextOutline
      : folderSharp;
  return (
    <IonItem
      key={document.id}
      color={location.pathname === url ? 'primary' : ''}
      routerLink={url}
      routerDirection="none"
      lines="none"
      detail={false}
    >
      <IonIcon aria-hidden="true" slot="start" icon={icon} />
      <IonButton
        slot="end"
        fill="clear"
        color="medium"
        onClick={e => {
          console.log('is it the modal?');
          setSelectedNode(document);
          // present({
          //   cssClass: 'context-menu-sheet-modal',
          //   htmlAttributes: {
          //     height: '116px'
          //   },
          //   keyboardClose: true,
          //   breakpoints: [0, 0.15, 0.5],
          //   initialBreakpoint: 0.15,
          //   handleBehavior: 'cycle'
          // });
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <IonIcon aria-hidden="true" icon={ellipsisVertical} />
      </IonButton>
      <IonLabel>{document.title}</IonLabel>
    </IonItem>
  );
};

const DocumentListToolbar = ({
  folderId,
  parentId
}: {
  folderId: string;
  parentId: string;
}) => {
  const history = useHistory();
  // const folderId = currentFolder.id!;
  return (
    <IonToolbar>
      <IonButtons slot="start">
        <IonButton
          disabled={folderId === ROOT_FOLDER}
          onClick={() => {
            history.push(GET_FOLDER_ROUTE(ROOT_FOLDER));
          }}
        >
          <IonIcon icon={home}></IonIcon>
        </IonButton>
        <IonButton
          disabled={folderId === ROOT_FOLDER}
          onClick={() => {
            history.push(GET_FOLDER_ROUTE(parentId));
          }}
        >
          <IonIcon icon={chevronBack}></IonIcon>
        </IonButton>
      </IonButtons>

      <IonButtons slot="end">
        <IonButton
          onClick={() => {
            documentsService.addFolder(folderId);
          }}
        >
          <IonIcon aria-hidden="true" ios={albums} md={albums} />
        </IonButton>
        <IonButton
          onClick={() => {
            documentsService.addDocument(folderId);
          }}
        >
          <IonIcon aria-hidden="true" ios={add} md={add} />
        </IonButton>
      </IonButtons>
    </IonToolbar>
  );
};

export const DocumentList = ({ parent: folder }: DocumentListProps) => {
  const parentFolder = documentsService.getDocumentNodeParent(folder);
  const documents: DocumentNodeResult[] =
    documentsService.useDocumentNodes(folder);
  const [selectedNode, setSelectedNode] = useState<DocumentNodeResult | null>(
    null
  );

  useEffect(() => {
    documentsService.generateFetchAllDocumentNodesQuery(folder);
    userSettingsService.setCurrentFolder(folder);
  }, [folder]);

  // const [present, dismiss] = useIonModal(() => (
  //   <>
  //     {selectedNode?.type === DocumentNodeType.folder && (
  //       <FolderActionsToolbar
  //         id={selectedNode.id || ''}
  //         title={selectedNode.title}
  //         rows={2}
  //         onClose={() => {
  //           dismiss();
  //           setSelectedNode(null);
  //         }}
  //       />
  //     )}
  //     {selectedNode?.type === DocumentNodeType.document && (
  //       <DocumentActionsToolbar
  //         id={selectedNode.id || ''}
  //         title={selectedNode.title}
  //         rows={2}
  //         onClose={() => {
  //           dismiss();
  //           setSelectedNode(null);
  //         }}
  //       />
  //     )}
  //   </>
  // ));

  return (
    <>
      <IonContent>
        <IonList id="document-explorer-menu-list">
          {documents.map(document => {
            return (
              // eslint-disable-next-line react/prop-types
              <DocumentListNodeItem
                key={document.id}
                document={document}
                setSelectedNode={setSelectedNode}
                // present={present}
              />
            );
          })}
        </IonList>
      </IonContent>

      <IonFooter>
        {selectedNode && (
          <>
            {selectedNode?.type === DocumentNodeType.folder && (
              <FolderActionsToolbar
                id={selectedNode.id}
                title={selectedNode.title}
                rows={2}
                onClose={() => {
                  // dismiss();
                  setSelectedNode(null);
                }}
              />
            )}
            {selectedNode?.type === DocumentNodeType.document && (
              <DocumentActionsToolbar
                id={selectedNode.id}
                title={selectedNode.title}
                rows={2}
                onClose={() => {
                  // dismiss();
                  setSelectedNode(null);
                }}
              />
            )}
          </>
        )}
        <DocumentListToolbar folderId={folder} parentId={parentFolder} />
      </IonFooter>
    </>
  );
};

export default DocumentList;
