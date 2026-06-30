import { INIT_ROUTE } from '@/common_to_migrate/routes';
import { APPICONS } from '@/constants';
import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import notebooksService from '@/domain/collection/notebooks.service';
import { IonButton, IonIcon, useIonModal } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import useCurrentNotebook from '../hooks/useCurrentNotebook';
import ManageNotebooksModal from './ManageNotebooksModal';

const NotebookSwitcher = () => {
  const history = useHistory();
  const current = useCurrentNotebook();
  const name = useSpaceCell<SpaceTables.Collection, 'title'>(
    SpaceTables.Collection,
    current,
    'title'
  );

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
