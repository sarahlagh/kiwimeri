import { IonButtons, IonToolbar } from '@ionic/react';
import DeleteDocumentButton from '../../common/buttons/DeleteDocumentButton';

export type CommonActionsToolbarProps = {
  id: string;
  rows?: number;
  onClose?: (confirmed: boolean) => void;
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
        <DeleteDocumentButton id={id} onClose={onClose} />
      </IonButtons>
    </IonToolbar>
  );
};
export default CommonActionsToolbar;
