import {
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import SortableList from '@/common/dnd/containers/SortableList';
import platformService from '@/common/services/platform.service';
import {
  APPICONS,
  APPICONS_PER_TYPE,
  CONFLICT_STR,
  SEARCH_RESULTS_HIGHLIGHT_KEY
} from '@/constants';
import collectionService from '@/db/collection.service';
import { contentSearchService } from '@/search/collection-content-search.service';
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
  IonLabel
} from '@ionic/react';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { Trans } from '@lingui/react/macro';
import { Fragment, ReactNode, useEffect, useRef, useState } from 'react';
import './CollectionItemList.css';

// TODO: tech debt - rewrite props, confirm code

type ConfirmCallback = (choice: boolean) => void;

type CollectionItemListSingleItemProps = {
  item: CollectionItemResult;
  actionsIcon?: string;
  selected?: string;
  highlighted?: boolean;
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
  searchText?: string;
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
  highlighted,
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
  const labelRef = useRef<HTMLIonLabelElement>(null);
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
  const className =
    (itemProps ? itemProps(item)?.className : '') +
    (highlighted ? ' collection-item-highlighted' : '');

  return (
    <IonItem
      id={'collection-item-' + item.id}
      className={className}
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
        <IonLabel
          id={'collection-item-label-' + item.id}
          ref={labelRef}
          color={item.conflict ? 'danger' : undefined}
        >
          {item.conflict ? CONFLICT_STR : ''}
          {item.title}
        </IonLabel>
      )}
    </IonItem>
  );
};

type CollectionItemMixIn = {
  highlighted?: boolean;
  isSearchResult?: boolean;
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
  footer,
  searchText
}: CollectionItemListProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [overId, setOverId] = useState<string | null>(null);

  const [toConfirm, setToConfirm] = useState<{
    id: string;
    callback: ConfirmCallback;
  }>();
  const confirm = (id: string, callback: ConfirmCallback) => {
    setToConfirm({ id, callback });
  };

  let finalItems = items;
  const itemsMixIn: Map<string, CollectionItemMixIn> = new Map();

  // TODO when opening doc, must open search result
  if (platformService.hasHighlightSupport()) {
    const ranges: Range[] = [];
    if (contentSearchService.acceptsSearchText(searchText)) {
      items.forEach(i => {
        const nextResult = contentSearchService.searchArbitraryText(
          i.title,
          searchText!
        );
        for (const result of nextResult) {
          if (!itemsMixIn.has(i.id)) {
            itemsMixIn.set(i.id, { isSearchResult: true });
          }
          const el = document.getElementById('collection-item-label-' + i.id);
          if (el) {
            const range = new Range();
            range.setStart(el.lastChild!, result.startOffset);
            range.setEnd(el.lastChild!, result.endOffset);
            ranges.push(range);
            ranges.push(range);
          }
        }
        if (contentSearchService.searchDocumentContent(i.id, searchText!)) {
          itemsMixIn.set(i.id, { isSearchResult: true, highlighted: true });
        }
      });
      finalItems = items.filter(
        i =>
          itemsMixIn.has(i.id) && itemsMixIn.get(i.id)?.isSearchResult === true
      );
    }
    const highlight = new Highlight(...ranges);
    CSS.highlights.set(SEARCH_RESULTS_HIGHLIGHT_KEY, highlight);
  }

  return (
    <>
      {header && <IonHeader class="subheader">{header}</IonHeader>}
      <IonContent>
        <SortableList
          items={finalItems}
          sortDisabled={!reorderEnabled || finalItems.length !== items.length}
          handleDragStart={() => {
            setIsDragging(true);
          }}
          handleDragEnd={() => {
            setIsDragging(false);
            setOverId(null);
          }}
          onItemMove={(from, to) => {
            collectionService.reorderItems(items, from, to);
          }}
          isContainer={item =>
            (item as CollectionItemResult).type === CollectionItemType.folder ||
            (item as CollectionItemResult).type === CollectionItemType.notebook
          }
          onContainerOver={id => {
            setOverId(id as string);
          }}
          onContainerDrop={(rowId, parentId) => {
            const callback: ConfirmCallback = ok => {
              if (ok) {
                collectionService.setItemParent(
                  rowId as string,
                  parentId as string
                );
              }
            };
            setToConfirm({ id: parentId as string, callback });
          }}
        >
          {finalItems.map(item => {
            return (
              <Fragment key={item.id}>
                {toConfirm?.id !== item.id && (
                  <CollectionItemListItem
                    actionsIcon={
                      overId === item.id ? APPICONS.moveAction : actionsIcon
                    }
                    selected={selected}
                    highlighted={itemsMixIn.get(item.id)?.highlighted}
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
