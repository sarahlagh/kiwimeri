import { CollectionItemResult } from '@/collection/collection';
import SortableList from '@/common/dnd/containers/SortableList';
import { APPICONS, APPICONS_PER_TYPE, CONFLICT_STR } from '@/constants';
import collectionService from '@/db/collection.service';
import {
  InputCustomEvent,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonReorder
} from '@ionic/react';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { Trans } from '@lingui/react/macro';
import { Fragment, ReactNode, useEffect, useRef, useState } from 'react';

// TODO: tech debt - rewrite props

type ConfirmCallback = (choice: boolean) => void;

type CollectionItemListSingleItemProps = {
  item: CollectionItemResult;
  actionsIcon?: string;
  selected?: string;
  itemRenaming?: string;
  itemProps?: (item: CollectionItemResult) => IonicReactProps | undefined;
  itemDisabled?: (item: CollectionItemResult) => boolean;
  actionDisabled?: (item: CollectionItemResult) => boolean;
  actionVisible?: (item: CollectionItemResult) => boolean;
  getUrl?: (item: CollectionItemResult) => string;
  onClickActions?: (
    e: Event,
    selectedItem: CollectionItemResult,
    confirm: (id: string, callback: ConfirmCallback) => void
  ) => void;
  onSelectedItem?: (selectedItem: CollectionItemResult) => void;
  onRenamingDone?: () => void;
  confirm: (id: string, callback: ConfirmCallback) => void;
};

type CollectionItemListProps = {
  items: CollectionItemResult[];
  reorderEnabled?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
} & Omit<CollectionItemListSingleItemProps, 'item' | 'confirm'>;

const AreYouSure = ({ onClick }: { onClick: (ok: boolean) => void }) => {
  return (
    <IonItem color="danger">
      <Trans>Are you sure?</Trans>
      <IonButtons slot="end">
        <IonButton
          fill="outline"
          onClick={() => {
            onClick(true);
          }}
        >
          <Trans>yes</Trans>
        </IonButton>
        <IonButton fill="solid" onClick={() => onClick(false)}>
          <Trans>no</Trans>
        </IonButton>
      </IonButtons>
    </IonItem>
  );
};

const CollectionItemListItem = ({
  selected,
  actionsIcon,
  item,
  itemProps,
  itemRenaming,
  itemDisabled,
  actionDisabled,
  actionVisible,
  getUrl,
  onClickActions,
  onSelectedItem,
  onRenamingDone,
  confirm
}: CollectionItemListSingleItemProps) => {
  const inputRenaming = useRef<HTMLIonInputElement>(null);
  const [renaming, setRenaming] = useState<boolean>(false);
  useEffect(() => {
    setRenaming(itemRenaming === item.id);
  }, [itemRenaming]);

  if (inputRenaming.current) {
    inputRenaming.current.setFocus();
  }

  const url = getUrl && !renaming ? getUrl(item) : undefined;
  const routerDirection = getUrl && !renaming ? 'none' : undefined;
  const icon = APPICONS_PER_TYPE.get(item.type);

  return (
    <IonItem
      className={itemProps ? itemProps(item)?.className : undefined}
      style={itemProps ? itemProps(item)?.style : undefined}
      disabled={itemDisabled ? itemDisabled(item) : false}
      button={!url}
      key={item.id}
      color={selected === item.id ? 'primary' : ''}
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
        if (!url && onSelectedItem) {
          onSelectedItem(item);
        }
      }}
    >
      <IonIcon aria-hidden="true" slot="start" icon={icon} />
      {(actionVisible ? actionVisible(item) : true) &&
        actionsIcon &&
        onClickActions && (
          <IonButton
            disabled={actionDisabled ? actionDisabled(item) : false}
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
              onClickActions(e.nativeEvent, item, confirm);
            }}
          >
            <IonIcon aria-hidden="true" icon={actionsIcon} />
          </IonButton>
        )}
      {renaming && (
        <IonInput
          class="invisible"
          ref={inputRenaming}
          value={item.title}
          onIonChange={(e: InputCustomEvent) => {
            if (itemRenaming && e.detail.value) {
              collectionService.setItemTitle(itemRenaming, e.detail.value);
              setRenaming(false);
              if (onRenamingDone) onRenamingDone();
            }
          }}
        ></IonInput>
      )}
      {!renaming && (
        <IonLabel color={item.conflict ? 'danger' : undefined}>
          {item.conflict ? CONFLICT_STR : ''}
          {item.title}
        </IonLabel>
      )}
      <IonReorder slot="end">
        <IonIcon icon={APPICONS.dragBar} size="small" color="medium"></IonIcon>
      </IonReorder>
    </IonItem>
  );
};

const CollectionItemList = ({
  items,
  actionsIcon,
  itemProps,
  itemRenaming,
  itemDisabled,
  actionDisabled,
  actionVisible,
  getUrl,
  onSelectedItem,
  onClickActions,
  onRenamingDone,
  selected,
  reorderEnabled = false,
  header,
  footer
}: CollectionItemListProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [toConfirm, setToConfirm] = useState<{
    id: string;
    callback: ConfirmCallback;
  }>();
  const confirm = (id: string, callback: ConfirmCallback) => {
    setToConfirm({ id, callback });
  };
  // TODO when document opened - overlay is lower than it should be
  // disabling the overlay fixes it, but why
  return (
    <>
      {header && <IonHeader class="subheader">{header}</IonHeader>}
      <IonContent>
        <SortableList
          items={items}
          sortDisabled={!reorderEnabled}
          disableOverlay={true}
          handleDragStart={() => {
            setIsDragging(true);
          }}
          handleDragEnd={() => {
            setIsDragging(false);
          }}
          onItemMove={(from, to) => {
            collectionService.reorderItems(items, from, to);
          }}
        >
          {items.map(item => {
            return (
              <Fragment key={item.id}>
                {toConfirm?.id !== item.id && (
                  <CollectionItemListItem
                    actionsIcon={actionsIcon}
                    selected={selected}
                    item={item}
                    itemProps={itemProps}
                    itemRenaming={itemRenaming}
                    itemDisabled={itemDisabled}
                    actionDisabled={actionDisabled}
                    actionVisible={actionVisible}
                    getUrl={isDragging ? undefined : getUrl}
                    onRenamingDone={onRenamingDone}
                    onSelectedItem={onSelectedItem}
                    onClickActions={event => {
                      if (onClickActions) {
                        onClickActions(event, item, confirm);
                      }
                    }}
                    confirm={confirm}
                  />
                )}
                {toConfirm?.id === item.id && (
                  <AreYouSure
                    onClick={choice => {
                      toConfirm.callback(choice);
                      setToConfirm(undefined);
                    }}
                  />
                )}
              </Fragment>
            );
          })}
        </SortableList>
      </IonContent>
      {footer && <IonFooter>{footer}</IonFooter>}
    </>
  );
};
export default CollectionItemList;
