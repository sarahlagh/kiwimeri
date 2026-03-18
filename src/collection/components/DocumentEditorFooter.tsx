import AddTagsButton from '@/common/buttons/AddTagsButton';
import { IonFooter } from '@ionic/react';
import WordCount from './WordCount';

interface DocumentEditorFooterProps {
  docId: string;
  pageId?: string;
}

const DocumentEditorFooter = ({ docId, pageId }: DocumentEditorFooterProps) => {
  const id = pageId ? pageId : docId;
  return (
    <>
      <IonFooter
        style={{ overflowX: 'auto', flexWrap: 'nowrap', display: 'flex' }}
      >
        <WordCount id={id} />
        <AddTagsButton id={docId} />
      </IonFooter>
    </>
  );
};
export default DocumentEditorFooter;
