import { IonButtons, IonLabel } from '@ionic/react';
import DeleteDocumentButton from '../../common/buttons/DeleteDocumentButton';
import TemplateActionsToolbar, {
  TemplateActionsToolbarProps
} from './TemplateActionsToolbar';

type DocumentActionsToolbarProps = {
  id: string;
  title?: string;
} & TemplateActionsToolbarProps;

const DocumentActionsToolbar = ({
  id,
  title,
  rows,
  onClose
}: DocumentActionsToolbarProps) => {
  return (
    <TemplateActionsToolbar rows={rows}>
      <IonLabel slot="start">{title}</IonLabel>
      <IonButtons slot="end">
        <DeleteDocumentButton id={id} onClose={onClose} />
      </IonButtons>
    </TemplateActionsToolbar>
  );
};
export default DocumentActionsToolbar;
