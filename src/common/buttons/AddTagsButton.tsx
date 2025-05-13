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

type AddTagsButtonProps = {
  id: Id;
};

const AddTagsButton = ({ id }: AddTagsButtonProps) => {
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
      <IonItem className="inner-item">
        <IonButton
          fill="clear"
          onClick={() => {
            present({
              cssClass: 'auto-height'
            });
          }}
        >
          <IonIcon icon={APPICONS.tags}></IonIcon>
        </IonButton>
        <IonText>{itemTags.join(', ')}</IonText>
      </IonItem>
    </>
  );
};
export default AddTagsButton;
