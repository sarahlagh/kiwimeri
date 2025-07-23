import { GET_FOLDER_ROUTE } from '@/common/routes';
import { APPICONS } from '@/constants';
import notebooksService from '@/db/notebooks.service';
import tagsService from '@/db/tags.service';
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
        history.push(GET_FOLDER_ROUTE(parentId));
        tagsService.reBuildTags();
      }
      dismiss();
    }
  });

  return (
    <IonButton
      expand="block"
      onClick={() => {
        present();
      }}
    >
      <IonIcon icon={APPICONS.moveAction}></IonIcon>
      {name}
    </IonButton>
  );
};
export default NotebookSwitcher;
