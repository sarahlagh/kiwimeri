import { IonButtons, IonLabel } from '@ionic/react';
import DeleteDocumentButton from '../../common/buttons/DeleteDocumentButton';
import TemplateActionsToolbar, {
  TemplateActionsToolbarProps
} from './TemplateActionsToolbar';

type FolderActionsToolbarProps = {
  id: string;
  title?: string;
} & TemplateActionsToolbarProps;

const FolderActionsToolbar = ({
  id,
  title,
  rows,
  onClose
}: FolderActionsToolbarProps) => {
  return (
    <TemplateActionsToolbar rows={rows}>
      <IonLabel slot="start">{title}</IonLabel>
      <IonButtons slot="end">
        <DeleteDocumentButton id={id} onClose={onClose} />
      </IonButtons>
    </TemplateActionsToolbar>
  );
};
export default FolderActionsToolbar;
