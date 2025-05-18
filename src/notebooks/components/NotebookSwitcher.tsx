import { APPICONS } from '@/constants';
import notebooksService from '@/db/notebooks.service';
import { IonButton, IonIcon, useIonModal } from '@ionic/react';
import ManageNotebooksModal from './ManageNotebooksModal';

const NotebookSwitcher = () => {
  const current = notebooksService.useCurrentNotebook();
  const name = notebooksService.useNotebookName(current);

  const [present, dismiss] = useIonModal(ManageNotebooksModal, {
    onClose: (parentId?: string) => {
      dismiss(parentId, parentId === undefined ? 'cancel' : 'choose');
    }
  });

  return (
    <>
      <IonButton
        expand="block"
        onClick={() => {
          present({ cssClass: 'auto-height' });
        }}
      >
        <IonIcon icon={APPICONS.moveAction}></IonIcon>
        {name}
      </IonButton>
    </>
  );
};
export default NotebookSwitcher;
