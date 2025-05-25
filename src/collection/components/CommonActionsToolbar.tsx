import { CollectionItemType } from '@/collection/collection';
import CloseDocumentButton from '@/common/buttons/CloseDocumentButton';
import DeleteItemButton from '@/common/buttons/DeleteItemButton';
import MoveFolderButton from '@/common/buttons/MoveFolderButton';
import RenameItemButton from '@/common/buttons/RenameItemButton';
import { GET_DOCUMENT_ROUTE, GET_FOLDER_ROUTE } from '@/common/routes';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import userSettingsService from '@/db/user-settings.service';
import { IonButton, IonButtons, IonIcon, IonToolbar } from '@ionic/react';

export type CommonActionsToolbarProps = {
  id: string;
  docId: string;
  // pageId?: string;
  rows?: number;
  onClose: (role?: string, data?: unknown) => void;
  showRename?: boolean;
  showInfo?: boolean;
  showClose?: boolean;
} & React.HTMLAttributes<HTMLIonToolbarElement>;

const CommonActionsToolbar = ({
  id,
  docId,
  rows = 1,
  showRename = false,
  showClose = false,
  showInfo = false,
  onClose
}: CommonActionsToolbarProps) => {
  const type = collectionService.getItemType(id);
  const showMoveFolder = type !== CollectionItemType.page;
  showRename = type !== CollectionItemType.page && showRename;
  showInfo = type !== CollectionItemType.page && showInfo;

  const folder = userSettingsService.getCurrentFolder();
  const fallbackRoute =
    type !== CollectionItemType.page
      ? GET_FOLDER_ROUTE(folder)
      : GET_DOCUMENT_ROUTE(folder, docId);

  return (
    <IonToolbar color="medium" style={{ height: rows * 56 + 'px' }}>
      <IonButtons slot="end">
        {showRename && <RenameItemButton id={id} onClose={onClose} />}
        {showMoveFolder && <MoveFolderButton id={id} onClose={onClose} />}
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

        {showClose && <CloseDocumentButton id={docId} onClose={onClose} />}
      </IonButtons>
    </IonToolbar>
  );
};
export default CommonActionsToolbar;
