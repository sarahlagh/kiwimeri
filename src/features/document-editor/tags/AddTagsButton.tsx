import { APPICONS } from '@/constants';
import collectionService from '@/db_to_migrate/collection.service';
import tagsService from '@/domain/collection/tags.service';
import { IonButton, IonIcon, IonText, useIonModal } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';
import ChooseTagsModal from './ChooseTagsModal';

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
      <IonButton
        fill="clear"
        onClick={() => {
          present({
            cssClass: 'fixed-width-modal'
          });
        }}
      >
        <IonIcon icon={APPICONS.tags}></IonIcon>
      </IonButton>
      <IonText>{itemTags.join(', ')}</IonText>
    </>
  );
};
export default AddTagsButton;
