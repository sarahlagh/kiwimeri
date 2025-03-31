import {
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonItem,
  IonLabel,
  IonList
} from '@ionic/react';
import { documentTextOutline, folderSharp } from 'ionicons/icons';
import { ReactNode } from 'react';
import { DocumentNodeResult, DocumentNodeType } from '../document';

type DocumentListNodeItemProps = {
  node: DocumentNodeResult;
  actionsIcon?: string;
  selected?: string;
  itemId?: string;
  itemDisabled?: (document: DocumentNodeResult) => boolean;
  actionDisabled?: (document: DocumentNodeResult) => boolean;
  getUrl?: (document: DocumentNodeResult) => string;
  onClickActions?: (e: Event, selectedNode: DocumentNodeResult) => void;
  onSelectedNode?: (selectedNode: DocumentNodeResult) => void;
};

type DocumentNodeListProps = {
  documents: DocumentNodeResult[];
  footer?: ReactNode;
} & Omit<DocumentListNodeItemProps, 'node'>;

const DocumentNodeListItem = ({
  itemId,
  selected,
  actionsIcon,
  node,
  itemDisabled,
  actionDisabled,
  getUrl,
  onClickActions,
  onSelectedNode
}: DocumentListNodeItemProps) => {
  const url = getUrl ? getUrl(node) : undefined;
  const routerDirection = getUrl ? 'none' : undefined;
  const icon =
    node.type === DocumentNodeType.document ? documentTextOutline : folderSharp;
  return (
    // https://github.com/ionic-team/ionic-framework/issues/28819 onClick won't fire
    <IonItem
      id={itemId ? `${itemId}-${node.id}` : undefined}
      disabled={itemDisabled ? itemDisabled(node) : false}
      button={!url}
      key={node.id}
      color={selected === node.id ? 'primary' : ''}
      routerLink={url}
      routerDirection={routerDirection}
      lines="none"
      detail={false}
      onClick={() => {
        if (!url && onSelectedNode) {
          onSelectedNode(node);
        }
      }}
    >
      <IonIcon aria-hidden="true" slot="start" icon={icon} />
      {actionsIcon && onClickActions && (
        <IonButton
          disabled={actionDisabled ? actionDisabled(node) : false}
          slot="end"
          fill="clear"
          color="medium"
          id="click-trigger"
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            onClickActions(e.nativeEvent, node);
          }}
        >
          <IonIcon aria-hidden="true" icon={actionsIcon} />
        </IonButton>
      )}
      <IonLabel>{node.title}</IonLabel>
    </IonItem>
  );
};

const DocumentNodeList = ({
  itemId,
  documents,
  actionsIcon,
  itemDisabled,
  actionDisabled,
  getUrl,
  onSelectedNode,
  onClickActions,
  selected,
  footer
}: DocumentNodeListProps) => {
  return (
    <>
      <IonContent>
        <IonList>
          {documents.map(node => {
            return (
              <DocumentNodeListItem
                itemId={itemId}
                key={node.id}
                actionsIcon={actionsIcon}
                selected={selected}
                node={node}
                itemDisabled={itemDisabled}
                actionDisabled={actionDisabled}
                getUrl={getUrl}
                onSelectedNode={onSelectedNode}
                onClickActions={event => {
                  if (onClickActions) {
                    onClickActions(event, node);
                  }
                }}
              />
            );
          })}
        </IonList>
      </IonContent>
      {footer && <IonFooter>{footer}</IonFooter>}
    </>
  );
};
export default DocumentNodeList;
