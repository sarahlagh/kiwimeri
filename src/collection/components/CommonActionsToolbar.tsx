import CloseDocumentButton from '@/common/buttons/CloseDocumentButton';
import DeleteItemButton from '@/common/buttons/DeleteItemButton';
import MoveFolderButton from '@/common/buttons/MoveFolderButton';
import RenameItemButton from '@/common/buttons/RenameItemButton';
import { IonButtons, IonToolbar } from '@ionic/react';

export type CommonActionsToolbarProps = {
  id: string;
  rows?: number;
  onClose: (role?: string, data?: unknown) => void;
  showRename?: boolean;
  showClose?: boolean;
} & React.HTMLAttributes<HTMLIonToolbarElement>;

const CommonActionsToolbar = ({
  id,
  rows = 1,
  showRename = false,
  showClose = false,
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
        {showClose && <CloseDocumentButton id={id} onClose={onClose} />}
      </IonButtons>
    </IonToolbar>
  );
};
export default CommonActionsToolbar;
