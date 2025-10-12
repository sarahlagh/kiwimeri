import { useHistory, useLocation } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonIcon,
  IonToolbar,
  useIonPopover
} from '@ionic/react';

import {
  CollectionItemResult,
  CollectionItemSort,
  CollectionItemType
} from '@/collection/collection';
import ExportItemsButton from '@/common/buttons/ExportItemsButton';
import ImportItemsButton from '@/common/buttons/ImportItemsButton';
import { GET_ITEM_ROUTE } from '@/common/routes';
import { getSearchParams } from '@/common/utils';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { useEffect, useState } from 'react';
import CollectionItemBreadcrumb from './CollectionItemBreadcrumb';
import CollectionItemList from './CollectionItemList';
import CommonActionsToolbar from './CommonActionsToolbar';
import SortFilter from './SortFilter';

interface CollectionItemBrowserListProps {
  parent: string;
}

const CollectionItemBrowserListToolbar = ({
  folderId,
  openedDocument
}: {
  folderId: string;
  openedDocument: string | undefined;
}) => {
  const history = useHistory();
  const openedDocumentFolder = openedDocument
    ? collectionService.getItemParent(openedDocument)
    : null;
  return (
    <IonToolbar>
      <IonButtons slot="start">
        <IonButton
          disabled={folderId === openedDocumentFolder || !openedDocument}
          onClick={() => {
            if (openedDocumentFolder) {
              history.push(
                GET_ITEM_ROUTE(openedDocumentFolder, openedDocument)
              );
            }
          }}
        >
          <IonIcon icon={APPICONS.goToCurrentFolder}></IonIcon>
        </IonButton>
      </IonButtons>

      <IonButtons slot="end">
        <ExportItemsButton type={CollectionItemType.folder} id={folderId} />
        <ImportItemsButton parent={folderId} />

        <IonButton
          onClick={() => {
            collectionService.addFolder(folderId);
          }}
        >
          <IonIcon aria-hidden="true" icon={APPICONS.addFolder} />
        </IonButton>
        <IonButton
          onClick={() => {
            collectionService.addDocument(folderId);
          }}
        >
          <IonIcon aria-hidden="true" icon={APPICONS.addDocument} />
        </IonButton>
      </IonButtons>
    </IonToolbar>
  );
};

export const CollectionItemBrowserList = ({
  parent: folder
}: CollectionItemBrowserListProps) => {
  const history = useHistory();
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const openedDocument = searchParams?.document;

  const displayOpts = collectionService.useItemDisplayOpts(folder);
  const sort: CollectionItemSort = displayOpts.sort || {
    by: 'created',
    descending: false
  };

  const items: CollectionItemResult[] =
    collectionService.useBrowsableCollectionItems(folder, sort);

  const [itemRenaming, setItemRenaming] = useState<string | undefined>(
    undefined
  );
  const [selectedItem, setSelectedItem] = useState<CollectionItemResult | null>(
    null
  );

  useEffect(() => {
    setItemRenaming(undefined);
  }, [folder]);

  const [presentActions, dismissActions] = useIonPopover(CommonActionsToolbar, {
    id: selectedItem?.id,
    docId: selectedItem?.id,
    showRename: true,
    onClose: (role: string, data?: string) => {
      if (role === 'rename') {
        setItemRenaming(data);
      }
      if (role === 'delete') {
        history.replace(data!);
      }
      dismissActions();
      setSelectedItem(null);
    }
  });

  const [presentSortFilter] = useIonPopover(SortFilter, {
    currentSort: sort,
    onChange: (sort?: CollectionItemSort) => {
      if (sort) {
        collectionService.setItemDisplayOpts(folder, { ...displayOpts, sort });
      }
    }
  });

  return (
    <CollectionItemList
      header={
        <IonToolbar className="slim">
          <CollectionItemBreadcrumb
            folder={folder}
            onClick={item => {
              history.push(GET_ITEM_ROUTE(item, openedDocument));
            }}
          />

          <IonButton
            fill="clear"
            slot="end"
            style={{ margin: '0' }}
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              presentSortFilter({ event: e.nativeEvent, alignment: 'end' });
            }}
          >
            <IonIcon icon={APPICONS.sortFilter}></IonIcon>
          </IonButton>
        </IonToolbar>
      }
      items={items}
      selected={openedDocument}
      getUrl={item =>
        item.type === CollectionItemType.document
          ? GET_ITEM_ROUTE(item.parent, item.id)
          : GET_ITEM_ROUTE(item.id, openedDocument)
      }
      actionsIcon={APPICONS.itemActions}
      itemRenaming={itemRenaming}
      onClickActions={(event, item) => {
        setSelectedItem(item);
        setItemRenaming(undefined);
        presentActions({
          event,
          alignment: 'end'
        });
      }}
      onRenamingDone={() => {
        setItemRenaming(undefined);
      }}
      footer={
        <CollectionItemBrowserListToolbar
          folderId={folder}
          openedDocument={openedDocument}
        />
      }
    />
  );
};

export default CollectionItemBrowserList;
