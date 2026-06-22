import { useToastContext } from '@/app/context/ToastContext';
import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { resumeService } from '@/domain/resume-state/resume-state.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { Id } from 'tinybase/with-schemas';
import { GET_DOCUMENT_ROUTE } from '../routes';

type QuickGroupButtonProps = {
  id: Id;
  type: CollectionItemTypeValues;
  onClose?: (role?: string, data?: string) => void;
};

const QuickGroupButton = ({ id, type, onClose }: QuickGroupButtonProps) => {
  const { t } = useLingui();
  if (type !== CollectionItemType.document) return <></>;
  const { setToast } = useToastContext();
  return (
    <IonButton
      fill="clear"
      onClick={() => {
        // create folder and put current doc in it
        const folder = resumeService.getCurrentFolder();
        const title = collectionService.getItemTitle(id);
        const { item } = collectionService.getNewFolderObj(folder);
        item.title = title;
        const newParent = collectionService.saveItem(item);
        collectionService.setItemParent(id, newParent);
        if (onClose) onClose('group', GET_DOCUMENT_ROUTE(newParent, id));
        setToast(t`Document grouped`, 'success');
      }}
    >
      <IonIcon icon={APPICONS.groupAction}></IonIcon>
    </IonButton>
  );
};
export default QuickGroupButton;
