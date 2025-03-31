import { IonButtons, IonToolbar } from '@ionic/react';
import DeleteNodeButton from '../../common/buttons/DeleteNodeButton';
import MoveFolderButton from '../../common/buttons/MoveFolderButton';

export type CommonActionsToolbarProps = {
  id: string;
  rows?: number;
  onClose: (confirmed: boolean) => void;
} & React.HTMLAttributes<HTMLIonToolbarElement>;

const CommonActionsToolbar = ({
  id,
  rows = 1,
  onClose,
  children
}: CommonActionsToolbarProps) => {
  return (
    <IonToolbar color="medium" style={{ height: rows * 56 + 'px' }}>
      <IonButtons slot="end">
        {children}
        <MoveFolderButton id={id} onClose={onClose} />
        <DeleteNodeButton id={id} onClose={onClose} />
      </IonButtons>
    </IonToolbar>
  );
};
export default CommonActionsToolbar;
