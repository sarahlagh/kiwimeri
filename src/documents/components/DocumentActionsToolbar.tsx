import { IonButtons } from '@ionic/react';
import DeleteDocumentButton from '../../common/buttons/DeleteDocumentButton';
import TemplateActionsToolbar, {
  TemplateActionsToolbarProps
} from './TemplateActionsToolbar';

type DocumentActionsToolbarProps = {
  id: string;
} & TemplateActionsToolbarProps;

const DocumentActionsToolbar = ({
  id,
  rows,
  onClose
}: DocumentActionsToolbarProps) => {
  return (
    <TemplateActionsToolbar rows={rows}>
      <IonButtons slot="end">
        <DeleteDocumentButton id={id} onClose={onClose} />
      </IonButtons>
    </TemplateActionsToolbar>
  );
};
export default DocumentActionsToolbar;
