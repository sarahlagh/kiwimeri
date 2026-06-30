import { INIT_ROUTE } from '@/common_to_migrate/routes';
import { APPICONS } from '@/constants';
import notebooksService from '@/db_to_migrate/notebooks.service';
import { IonButton, IonIcon, useIonModal } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import ManageNotebooksModal from './ManageNotebooksModal';

const NotebookSwitcher = () => {
  const history = useHistory();
  const current = notebooksService.useCurrentNotebook();
  const name = notebooksService.useNotebookTitle(current);

  const [present, dismiss] = useIonModal(ManageNotebooksModal, {
    onClose: (parentId?: string) => {
      if (parentId) {
        notebooksService.setCurrentNotebook(parentId);
        history.push(INIT_ROUTE);
      }
      dismiss();
    }
  });

  return (
    <IonButton
      expand="block"
      onClick={() => {
        present({
          cssClass: 'fixed-width-modal'
        });
      }}
    >
      <IonIcon icon={APPICONS.notebook}></IonIcon>
      {name}
    </IonButton>
  );
};
export default NotebookSwitcher;
