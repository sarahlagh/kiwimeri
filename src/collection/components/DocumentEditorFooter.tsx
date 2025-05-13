import AddTagsButton from '@/common/buttons/AddTagsButton';
import { IonFooter } from '@ionic/react';

interface DocumentEditorFooterProps {
  id: string;
}

const DocumentEditorFooter = ({ id }: DocumentEditorFooterProps) => {
  return (
    <>
      <IonFooter
        style={{ overflowX: 'auto', flexWrap: 'nowrap', display: 'flex' }}
      >
        <AddTagsButton id={id} />
      </IonFooter>
    </>
  );
};
export default DocumentEditorFooter;
