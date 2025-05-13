import AddTagButton from '@/common/buttons/AddTagButton';
import { IonFooter } from '@ionic/react';

interface DocumentEditorFooterProps {
  id: string;
}

const DocumentEditorFooter = ({ id }: DocumentEditorFooterProps) => {
  // const itemTags = collectionService.useItemTags(id);
  return (
    <>
      <IonFooter
        style={{ overflowX: 'auto', flexWrap: 'nowrap', display: 'flex' }}
      >
        {/* {itemTags.map(tag => (
          <IonChip key={tag}>
            <IonLabel>{tag}</IonLabel>
          </IonChip>
        ))} */}
        <AddTagButton id={id} />
      </IonFooter>
    </>
  );
};
export default DocumentEditorFooter;
