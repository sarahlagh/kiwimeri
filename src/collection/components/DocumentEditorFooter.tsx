import AddTagsButton from '@/common/buttons/AddTagsButton';
import { IonFooter } from '@ionic/react';
import WordCount from './WordCount';

interface DocumentEditorFooterProps {
  id: string;
}

const DocumentEditorFooter = ({ id }: DocumentEditorFooterProps) => {
  return (
    <>
      <IonFooter
        style={{ overflowX: 'auto', flexWrap: 'nowrap', display: 'flex' }}
      >
        <WordCount id={id} />
        <AddTagsButton id={id} />
      </IonFooter>
    </>
  );
};
export default DocumentEditorFooter;
