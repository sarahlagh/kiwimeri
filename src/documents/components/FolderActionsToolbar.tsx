import { IonButtons } from '@ionic/react';
import DeleteDocumentButton from '../../common/buttons/DeleteDocumentButton';
import TemplateActionsToolbar, {
  TemplateActionsToolbarProps
} from './TemplateActionsToolbar';

type FolderActionsToolbarProps = {
  id: string;
} & TemplateActionsToolbarProps;

const FolderActionsToolbar = ({
  id,
  rows,
  onClose
}: FolderActionsToolbarProps) => {
  return (
    <TemplateActionsToolbar rows={rows}>
      <IonButtons slot="end">
        <DeleteDocumentButton id={id} onClose={onClose} />
      </IonButtons>
    </TemplateActionsToolbar>
  );
};
export default FolderActionsToolbar;
