import { CollectionItemType } from '@/collection/collection';
import CloseDocumentButton from '@/common/buttons/CloseDocumentButton';
import DeleteItemButton from '@/common/buttons/DeleteItemButton';
import ExportItemsButton from '@/common/buttons/ExportItemsButton';
import MoveFolderButton from '@/common/buttons/MoveFolderButton';
import RenameItemButton from '@/common/buttons/RenameItemButton';
import { GET_DOCUMENT_ROUTE, GET_FOLDER_ROUTE } from '@/common/routes';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import navService from '@/db/nav.service';
import { IonButton, IonButtons, IonIcon, IonToolbar } from '@ionic/react';
import { ReactNode } from 'react';

export type CommonActionsToolbarProps = {
  id: string;
  docId: string;
  rows?: number;
  getBackRoute?: () => string;
  onClose: (role?: string, data?: unknown) => void;
  showMoveFolder?: boolean;
  showRename?: boolean;
  showInfo?: boolean;
  showClose?: boolean;
  showDelete?: boolean;
} & React.HTMLAttributes<HTMLIonToolbarElement> & {
    readonly children?: ReactNode;
  };

const CommonActionsToolbar = ({
  id,
  docId,
  rows = 1,
  showMoveFolder = true,
  showRename = false,
  showClose = false,
  showInfo = false,
  showDelete = true,
  children,
  getBackRoute,
  onClose
}: CommonActionsToolbarProps) => {
  const type = collectionService.getItemType(id);
  showMoveFolder = showMoveFolder && type !== CollectionItemType.page;

  showRename = type !== CollectionItemType.page && showRename;
  showInfo = type !== CollectionItemType.page && showInfo;

  const folder = navService.getCurrentFolder();
  const fallbackRoute =
    type !== CollectionItemType.page
      ? GET_FOLDER_ROUTE(folder)
      : GET_DOCUMENT_ROUTE(folder, docId);

  return (
    <IonToolbar color="medium" style={{ height: rows * 56 + 'px' }}>
      <IonButtons slot="end">
        {showRename && <RenameItemButton id={id} onClose={onClose} />}
        {showMoveFolder && <MoveFolderButton id={id} onClose={onClose} />}
        <ExportItemsButton id={id} type={type} onClose={onClose} />

        {showDelete && (
          <DeleteItemButton
            id={id}
            fallbackRoute={fallbackRoute}
            onClose={onClose}
          />
        )}

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

        {children}

        {showClose && (
          <CloseDocumentButton
            id={docId}
            getRoute={getBackRoute}
            onClose={onClose}
          />
        )}
      </IonButtons>
    </IonToolbar>
  );
};
export default CommonActionsToolbar;
