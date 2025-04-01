import { useHistory } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonIcon,
  IonToolbar,
  useIonPopover
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { useSearchParams } from '../../common/hooks/useSearchParams';
import { GET_NODE_ROUTE } from '../../common/routes';
import { APPICONS } from '../../constants';
import documentsService from '../../db/documents.service';
import userSettingsService from '../../db/user-settings.service';
import { DocumentNodeResult, DocumentNodeType } from '../document';
import CommonActionsToolbar from './CommonActionsToolbar';
import DocumentNodeBreadcrumb from './DocumentNodeBreadcrumb';
import DocumentNodeList from './DocumentNodeList';

interface DocumentNodeBrowserListProps {
  parent: string;
}

const DocumentNodeBrowserListToolbar = ({
  folderId,
  openedDocument
}: {
  folderId: string;
  openedDocument: string | undefined;
}) => {
  const history = useHistory();
  const openedDocumentFolder = openedDocument
    ? documentsService.getDocumentNodeParent(openedDocument)
    : null;
  return (
    <IonToolbar>
      <IonButtons slot="start">
        <IonButton
          disabled={folderId === openedDocumentFolder}
          onClick={() => {
            if (openedDocumentFolder) {
              history.push(
                GET_NODE_ROUTE(openedDocumentFolder, openedDocument)
              );
            }
          }}
        >
          <IonIcon icon={APPICONS.goToCurrentFolder}></IonIcon>
        </IonButton>
      </IonButtons>

      <IonButtons slot="end">
        <IonButton
          onClick={() => {
            documentsService.addFolder(folderId);
          }}
        >
          <IonIcon aria-hidden="true" icon={APPICONS.addFolder} />
        </IonButton>
        <IonButton
          onClick={() => {
            documentsService.addDocument(folderId);
          }}
        >
          <IonIcon aria-hidden="true" icon={APPICONS.addDocument} />
        </IonButton>
      </IonButtons>
    </IonToolbar>
  );
};

export const DocumentNodeBrowserList = ({
  parent: folder
}: DocumentNodeBrowserListProps) => {
  const searchParams = useSearchParams();
  const history = useHistory();
  const openedDocument = searchParams?.document;
  const documents: DocumentNodeResult[] =
    documentsService.useDocumentNodes(folder);
  const [itemRenaming, setItemRenaming] = useState<string | undefined>(
    undefined
  );
  const [selectedNode, setSelectedNode] = useState<DocumentNodeResult | null>(
    null
  );

  useEffect(() => {
    documentsService.generateFetchAllDocumentNodesQuery(folder);
    userSettingsService.setCurrentFolder(folder);
    setItemRenaming(undefined);
  }, [folder]);

  const [present, dismiss] = useIonPopover(CommonActionsToolbar, {
    id: selectedNode?.id,
    showRename: true,
    onClose: (role: string, data?: string) => {
      if (role === 'rename') {
        setItemRenaming(data);
      }
      dismiss();
      setSelectedNode(null);
    }
  });

  return (
    <DocumentNodeList
      header={
        <DocumentNodeBreadcrumb
          folder={folder}
          onClick={node => {
            history.push(GET_NODE_ROUTE(node, openedDocument));
          }}
        />
      }
      documents={documents}
      selected={openedDocument}
      getUrl={document =>
        document.type === DocumentNodeType.document
          ? GET_NODE_ROUTE(document.parent, document.id)
          : GET_NODE_ROUTE(document.id, openedDocument)
      }
      actionsIcon={APPICONS.nodeActions}
      itemRenaming={itemRenaming}
      onClickActions={(event, node) => {
        setSelectedNode(node);
        setItemRenaming(undefined);
        present({
          event,
          alignment: 'end'
        });
      }}
      onRenamingDone={() => {
        setItemRenaming(undefined);
      }}
      footer={
        <DocumentNodeBrowserListToolbar
          folderId={folder}
          openedDocument={openedDocument}
        />
      }
    />
  );
};

export default DocumentNodeBrowserList;
