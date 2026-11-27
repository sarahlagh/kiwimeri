import {
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonToolbar,
  useIonPopover
} from '@ionic/react';

import { GET_ITEM_ROUTE } from '@/app/routes';
import { APPICONS } from '@/constants';
import { CollectionItemType } from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import { ExportItemsButton, ImportItemsButton } from '@/features/import-export';

import { settingsService } from '@/domain/collection/collection-settings.service';
import notebooksService from '@/domain/collection/notebooks.service';

import { useSearchQuery } from '@/app/context/RouteContext';
import type { ActionsFromBrowserToolbarProps } from '@/features/collection-item-actions';
import { useHasLocalConflicts } from '@/features/synchronization-ui';
import { defineI18nMap } from '@/shared/misc/i18n-utils';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { Dispatch, lazy, SetStateAction, Suspense, useState } from 'react';
import { useNavigate } from 'react-router';
import { BrowsableItemResult } from '../browsable-item';
import useCollectionItemBrowserListResults, {
  browserModes,
  BrowserQueryMode
} from '../hooks/useCollectionItemBrowserListResults';
import useFolderEffectiveSort from '../hooks/useFolderEffectiveSort';
import useNotebookLastBrowserMode from '../hooks/useNotebookLastBrowserMode';
import CollectionItemBreadcrumb from './CollectionItemBreadcrumb';
import CollectionItemList from './CollectionItemList';
import SortFilterInlineList from './SortFilterInlineList';

const ActionsFromBrowserToolbar = lazy(() =>
  import('@/features/collection-item-actions').then(m => ({
    default: m.ActionsFromBrowserToolbar
  }))
);
function ActionsFromBrowserToolbarWrapped(
  props: ActionsFromBrowserToolbarProps
) {
  return (
    <Suspense>
      <ActionsFromBrowserToolbar {...props} />
    </Suspense>
  );
}
interface CollectionItemBrowserListProps {
  parentId: string;
  documentId?: string;
}

const CollectionItemBrowserListToolbar = ({
  folderId,
  openedDocument,
  searchText,
  setSearchText,
  mode,
  nextMode
}: {
  folderId: string;
  openedDocument: string | undefined;
  mode: BrowserQueryMode;
  nextMode: () => void;
  searchText?: string | null;
  setSearchText: Dispatch<SetStateAction<string | undefined | null>>;
}) => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [openFilters, setOpenFilters] = useState(false);
  const openedDocumentFolder = openedDocument
    ? collectionService.getItemParent(openedDocument)
    : null;

  return (
    <SortFilterInlineList
      id={folderId}
      sortEnabled={mode === 'browser' && openFilters}
      searchEnabled={openFilters}
      searchText={searchText || ''}
      onSearch={setSearchText}
    >
      <IonItem lines="none">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              aria-label={t`go to current folder`}
              disabled={folderId === openedDocumentFolder || !openedDocument}
              onClick={() => {
                if (openedDocumentFolder) {
                  navigate(
                    GET_ITEM_ROUTE(openedDocumentFolder, openedDocument)
                  );
                }
              }}
            >
              <IonIcon icon={APPICONS.goToCurrentFolder}></IonIcon>
            </IonButton>
            <IonButton
              aria-label={t`show search sort filters`}
              disabled={mode !== 'browser'}
              onClick={() => setOpenFilters(!openFilters)}
            >
              <IonIcon icon={APPICONS.sortFilter}></IonIcon>
            </IonButton>

            <IonButton
              aria-label={t`toggle browser mode`}
              disabled={mode === 'conflicts'}
              onClick={() => {
                setOpenFilters(false);
                nextMode();
              }}
            >
              <IonIcon icon={APPICONS.circleOptions}></IonIcon>
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
      </IonItem>
    </SortFilterInlineList>
  );
};

const modeLabels = defineI18nMap<BrowserQueryMode>([
  ['lastActivityAt', msg`Last updated documents`],
  ['lastOpenedAt', msg`Last consulted documents`],
  ['conflicts', msg`Conflicts`]
]);

const PrivateCollectionItemBrowserList = ({
  parentId: folderId,
  documentId: openedDocument
}: CollectionItemBrowserListProps) => {
  const navigate = useNavigate();
  const { i18n } = useLingui();
  const hasConflicts = useHasLocalConflicts();

  const sort = useFolderEffectiveSort(folderId);
  const modeIdx = useNotebookLastBrowserMode();

  const currentMode = hasConflicts ? 'conflicts' : browserModes[modeIdx];
  const items: BrowsableItemResult[] = useCollectionItemBrowserListResults(
    currentMode,
    folderId,
    sort
  );

  const [renamingItemId, setRenamingItemId] = useState<string | undefined>(
    undefined
  );
  const [selectedItem, setSelectedItem] = useState<BrowsableItemResult | null>(
    null
  );

  const [presentActions, dismissActions] = useIonPopover(
    ActionsFromBrowserToolbarWrapped,
    {
      id: selectedItem?.id || '',
      onClose: (role?: string, data?: unknown) => dismissActions(data, role)
    }
  );

  const [searchText, setSearchText] = useState<string | null>();
  const queryFromDocument = useSearchQuery();
  const query =
    searchText && searchText.length > 0 ? searchText : queryFromDocument;

  return (
    <CollectionItemList
      header={
        <>
          {currentMode === 'browser' ? (
            <CollectionItemBreadcrumb
              folderId={folderId}
              onClick={item => {
                navigate(GET_ITEM_ROUTE(item, openedDocument, query));
              }}
            />
          ) : (
            <IonLabel style={{ lineHeight: '36px', marginLeft: '18px' }}>
              <i>{modeLabels.get(i18n, currentMode)}</i>
            </IonLabel>
          )}
        </>
      }
      searchText={searchText}
      reorderEnabled={sort.by === 'order'}
      items={items}
      selected={openedDocument}
      getUrl={item =>
        item.type === CollectionItemType.document
          ? GET_ITEM_ROUTE(item.parentId, item.id, query)
          : GET_ITEM_ROUTE(item.id, openedDocument, query)
      }
      actionsIcon={APPICONS.itemActions}
      itemRenaming={renamingItemId}
      onClickActions={(event, item) => {
        setSelectedItem(item);
        setRenamingItemId(undefined);
        presentActions({
          event,
          alignment: 'end',
          onDidDismiss(e) {
            const { role, data } = e.detail;
            if (role === 'rename') {
              setRenamingItemId(e.detail.data);
            }
            if (role === 'delete') {
              navigate(data!);
            }
            if (role === 'group') {
              navigate(data!);
            }
            setSelectedItem(null);
          }
        });
      }}
      onRenamingDone={() => {
        setRenamingItemId(undefined);
      }}
      footer={
        <CollectionItemBrowserListToolbar
          folderId={folderId}
          openedDocument={openedDocument}
          searchText={searchText}
          setSearchText={setSearchText}
          mode={currentMode}
          nextMode={() => {
            let idx = modeIdx + 1;
            if (idx === browserModes.length) idx = 0;
            const notebook = notebooksService.getCurrentNotebook();
            settingsService.setNotebookDefaultBrowserMode(notebook, idx);
          }}
        />
      }
    />
  );
};

export const CollectionItemBrowserList = (
  props: CollectionItemBrowserListProps
) => {
  return <PrivateCollectionItemBrowserList key={props.parentId} {...props} />;
};
export default CollectionItemBrowserList;
