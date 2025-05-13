import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import tagsService from '@/db/tags.service';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonText,
  useIonModal
} from '@ionic/react';
import { Id } from 'tinybase/with-schemas';
import ChooseTagsModal from '../modals/ChooseTagsModal';

type AddTagButtonProps = {
  id: Id;
};

const AddTagButton = ({ id }: AddTagButtonProps) => {
  const itemTags = [...collectionService.useItemTags(id)];

  const [present, dismiss] = useIonModal(ChooseTagsModal, {
    id,
    onClose: (tags?: string[]) => {
      if (tags) {
        tagsService.setItemTags(id, tags);
      }
      dismiss(tags, tags === undefined ? 'cancel' : 'choose');
    }
  });

  return (
    <>
      <IonItem>
        <IonButton
          fill="clear"
          onClick={() => {
            present();
          }}
        >
          <IonIcon icon={APPICONS.tags}></IonIcon>
        </IonButton>
        <IonText>{itemTags.join(', ')}</IonText>
      </IonItem>
    </>
  );
};
export default AddTagButton;
