import { APPICONS } from '@/constants';
import documentsService from '@/db/documents.service';
import { DocumentNodeResult, DocumentNodeType } from '@/documents/document';
import {
  InputCustomEvent,
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList
} from '@ionic/react';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { ReactNode, useEffect, useRef, useState } from 'react';

type DocumentListNodeItemProps = {
  node: DocumentNodeResult;
  actionsIcon?: string;
  selected?: string;
  itemRenaming?: string;
  itemProps?: (document: DocumentNodeResult) => IonicReactProps | undefined;
  itemDisabled?: (document: DocumentNodeResult) => boolean;
  actionDisabled?: (document: DocumentNodeResult) => boolean;
  getUrl?: (document: DocumentNodeResult) => string;
  onClickActions?: (e: Event, selectedNode: DocumentNodeResult) => void;
  onSelectedNode?: (selectedNode: DocumentNodeResult) => void;
  onRenamingDone?: () => void;
};

type DocumentNodeListProps = {
  documents: DocumentNodeResult[];
  header?: ReactNode;
  footer?: ReactNode;
} & Omit<DocumentListNodeItemProps, 'node'>;

const DocumentNodeListItem = ({
  selected,
  actionsIcon,
  node,
  itemProps,
  itemRenaming,
  itemDisabled,
  actionDisabled,
  getUrl,
  onClickActions,
  onSelectedNode,
  onRenamingDone
}: DocumentListNodeItemProps) => {
  const inputRenaming = useRef<HTMLIonInputElement>(null);
  const [renaming, setRenaming] = useState<boolean>(false);
  useEffect(() => {
    setRenaming(itemRenaming === node.id);
  }, [itemRenaming]);

  if (inputRenaming.current) {
    inputRenaming.current.setFocus();
  }

  const url = getUrl && !renaming ? getUrl(node) : undefined;
  const routerDirection = getUrl && !renaming ? 'none' : undefined;
  const icon =
    node.type === DocumentNodeType.document
      ? APPICONS.document
      : APPICONS.folder;

  return (
    <IonItem
      className={itemProps ? itemProps(node)?.className : undefined}
      style={itemProps ? itemProps(node)?.style : undefined}
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
          ref={inputRenaming}
          value={node.title}
          onIonChange={(e: InputCustomEvent) => {
            if (itemRenaming && e.detail.value) {
              documentsService.setDocumentNodeTitle(
                itemRenaming,
                e.detail.value
              );
              setRenaming(false);
              if (onRenamingDone) onRenamingDone();
            }
          }}
        ></IonInput>
      )}
      {!renaming && <IonLabel>{node.title}</IonLabel>}
    </IonItem>
  );
};

const DocumentNodeList = ({
  documents,
  actionsIcon,
  itemProps,
  itemRenaming,
  itemDisabled,
  actionDisabled,
  getUrl,
  onSelectedNode,
  onClickActions,
  onRenamingDone,
  selected,
  header,
  footer
}: DocumentNodeListProps) => {
  return (
    <>
      {header && <IonHeader>{header}</IonHeader>}
      <IonContent>
        <IonList>
          {documents.map(node => {
            return (
              <DocumentNodeListItem
                key={node.id}
                actionsIcon={actionsIcon}
                selected={selected}
                node={node}
                itemProps={itemProps}
                itemRenaming={itemRenaming}
                itemDisabled={itemDisabled}
                actionDisabled={actionDisabled}
                getUrl={getUrl}
                onRenamingDone={onRenamingDone}
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
