import {
  InputCustomEvent,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonInput,
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
  itemRenaming?: (document: DocumentNodeResult) => boolean;
  itemDisabled?: (document: DocumentNodeResult) => boolean;
  actionDisabled?: (document: DocumentNodeResult) => boolean;
  getUrl?: (document: DocumentNodeResult) => string;
  onItemRenamed?: (newTitle: string) => void;
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
  itemRenaming,
  itemDisabled,
  actionDisabled,
  getUrl,
  onItemRenamed,
  onClickActions,
  onSelectedNode
}: DocumentListNodeItemProps) => {
  const renaming = itemRenaming && itemRenaming(node);
  const url = getUrl && !renaming ? getUrl(node) : undefined;
  const routerDirection = getUrl && !renaming ? 'none' : undefined;
  const icon =
    node.type === DocumentNodeType.document ? documentTextOutline : folderSharp;
  return (
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
      onClick={e => {
        if (renaming) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }
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
            if (renaming) {
              return;
            }
            onClickActions(e.nativeEvent, node);
          }}
        >
          <IonIcon aria-hidden="true" icon={actionsIcon} />
        </IonButton>
      )}
      {renaming && (
        <IonInput
          class="invisible"
          value={node.title}
          onIonChange={(e: InputCustomEvent) => {
            if (onItemRenamed && e.detail.value) {
              onItemRenamed(e.detail.value);
            }
          }}
        ></IonInput>
      )}
      {!renaming && <IonLabel>{node.title}</IonLabel>}
    </IonItem>
  );
};

const DocumentNodeList = ({
  itemId,
  documents,
  actionsIcon,
  itemRenaming,
  itemDisabled,
  actionDisabled,
  getUrl,
  onItemRenamed,
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
                itemRenaming={itemRenaming}
                itemDisabled={itemDisabled}
                actionDisabled={actionDisabled}
                getUrl={getUrl}
                onItemRenamed={onItemRenamed}
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
