import {
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
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

type CollectionItemListSingleItemProps = {
  item: CollectionItemResult;
  actionsIcon?: string;
  selected?: string;
  itemRenaming?: string;
  itemProps?: (item: CollectionItemResult) => IonicReactProps | undefined;
  itemDisabled?: (item: CollectionItemResult) => boolean;
  actionDisabled?: (item: CollectionItemResult) => boolean;
  getUrl?: (item: CollectionItemResult) => string;
  onClickActions?: (e: Event, selectedItem: CollectionItemResult) => void;
  onSelectedItem?: (selectedItem: CollectionItemResult) => void;
  onRenamingDone?: () => void;
};

type CollectionItemListProps = {
  items: CollectionItemResult[];
  header?: ReactNode;
  footer?: ReactNode;
} & Omit<CollectionItemListSingleItemProps, 'item'>;

const CollectionItemListItem = ({
  selected,
  actionsIcon,
  item,
  itemProps,
  itemRenaming,
  itemDisabled,
  actionDisabled,
  getUrl,
  onClickActions,
  onSelectedItem,
  onRenamingDone
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
  const icon =
    item.type === CollectionItemType.document
      ? APPICONS.document
      : APPICONS.folder;

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
      {actionsIcon && onClickActions && (
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
            onClickActions(e.nativeEvent, item);
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
      {!renaming && <IonLabel>{item.title}</IonLabel>}
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
  getUrl,
  onSelectedItem,
  onClickActions,
  onRenamingDone,
  selected,
  header,
  footer
}: CollectionItemListProps) => {
  return (
    <>
      {header && <IonHeader class="subheader">{header}</IonHeader>}
      <IonContent>
        <IonList>
          {items.map(item => {
            return (
              <CollectionItemListItem
                key={item.id}
                actionsIcon={actionsIcon}
                selected={selected}
                item={item}
                itemProps={itemProps}
                itemRenaming={itemRenaming}
                itemDisabled={itemDisabled}
                actionDisabled={actionDisabled}
                getUrl={getUrl}
                onRenamingDone={onRenamingDone}
                onSelectedItem={onSelectedItem}
                onClickActions={event => {
                  if (onClickActions) {
                    onClickActions(event, item);
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
export default CollectionItemList;
