import CloseDocumentButton from '@/common/buttons/CloseDocumentButton';
import DeleteItemButton from '@/common/buttons/DeleteItemButton';
import MoveFolderButton from '@/common/buttons/MoveFolderButton';
import RenameItemButton from '@/common/buttons/RenameItemButton';
import { APPICONS } from '@/constants';
import { IonButton, IonButtons, IonIcon, IonToolbar } from '@ionic/react';

export type CommonActionsToolbarProps = {
  id: string;
  rows?: number;
  onClose: (role?: string, data?: unknown) => void;
  showRename?: boolean;
  showInfo?: boolean;
  showClose?: boolean;
} & React.HTMLAttributes<HTMLIonToolbarElement>;

const CommonActionsToolbar = ({
  id,
  rows = 1,
  showRename = false,
  showClose = false,
  showInfo = false,
  onClose,
  children
}: CommonActionsToolbarProps) => {
  return (
    <IonToolbar color="medium" style={{ height: rows * 56 + 'px' }}>
      <IonButtons slot="end">
        {children}
        {showRename && <RenameItemButton id={id} onClose={onClose} />}
        <MoveFolderButton id={id} onClose={onClose} />
        <DeleteItemButton id={id} onClose={onClose} />

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

        {showClose && <CloseDocumentButton id={id} onClose={onClose} />}
      </IonButtons>
    </IonToolbar>
  );
};
export default CommonActionsToolbar;
