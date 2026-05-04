import { CollectionItemType } from '@/collection/collection';
import CloseDocumentButton from '@/common/buttons/CloseDocumentButton';
import DeleteItemButton from '@/common/buttons/DeleteItemButton';
import ExportItemsButton from '@/common/buttons/ExportItemsButton';
import ManageHistoryButton from '@/common/buttons/ManageHistoryButton';
import MoveFolderButton from '@/common/buttons/MoveFolderButton';
import SearchButton from '@/common/buttons/SearchButton';
import { GET_DOCUMENT_ROUTE, GET_FOLDER_ROUTE } from '@/common/routes';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import navService from '@/db/nav.service';
import { IonButton, IonButtons, IonIcon, IonToolbar } from '@ionic/react';

export type ActionsFromDocumentEditorToolbarProps = {
  id: string;
  docId: string;
  onClose: (role?: string, data?: unknown) => void;
  onSearch: () => void;
};

const ActionsFromDocumentEditorToolbar = ({
  id,
  docId,
  onClose,
  onSearch
}: ActionsFromDocumentEditorToolbarProps) => {
  const type = collectionService.getItemType(id);
  const showMoveFolder = type !== CollectionItemType.page;
  const showInfo = type !== CollectionItemType.page;

  const folder = navService.getCurrentFolder();
  const fallbackRoute =
    type !== CollectionItemType.page
      ? GET_FOLDER_ROUTE(folder)
      : GET_DOCUMENT_ROUTE(folder, docId);

  return (
    <IonToolbar color="medium" style={{ height: 56 + 'px' }}>
      <IonButtons slot="end">
        {showMoveFolder && <MoveFolderButton id={id} onClose={onClose} />}
        <ExportItemsButton id={id} type={type} onClose={onClose} />
        <DeleteItemButton
          id={id}
          fallbackRoute={fallbackRoute}
          onClose={onClose}
        />

        {showInfo && (
          <IonButton
            expand="block"
            onClick={() => {
              onClose('info', id);
            }}
          >
            <IonIcon icon={APPICONS.info}></IonIcon>
          </IonButton>
        )}

        <ManageHistoryButton
          id={docId}
          afterRestore={() => onClose('restore', id)}
        />
        <SearchButton onSearch={onSearch} />
        <CloseDocumentButton id={docId} onClose={onClose} />
      </IonButtons>
    </IonToolbar>
  );
};
export default ActionsFromDocumentEditorToolbar;
