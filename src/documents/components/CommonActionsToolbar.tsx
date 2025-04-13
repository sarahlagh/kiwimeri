import CloseDocumentButton from '@/common/buttons/CloseDocumentButton';
import DeleteNodeButton from '@/common/buttons/DeleteNodeButton';
import MoveFolderButton from '@/common/buttons/MoveFolderButton';
import RenameNodeButton from '@/common/buttons/RenameNodeButton';
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
        {showRename && <RenameNodeButton id={id} onClose={onClose} />}
        <MoveFolderButton id={id} onClose={onClose} />
        <DeleteNodeButton id={id} onClose={onClose} />
        {showClose && <CloseDocumentButton id={id} onClose={onClose} />}
      </IonButtons>
    </IonToolbar>
  );
};
export default CommonActionsToolbar;
