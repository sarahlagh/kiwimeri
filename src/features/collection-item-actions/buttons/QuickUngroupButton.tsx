import { APPICONS } from '@/constants';
import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import AreYouSureAlert from '@/shared/modals/AreYouSureAlert';
import { IonButton, IonIcon } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { Id } from 'tinybase/with-schemas';

type QuickUngroupButtonProps = {
  id: Id;
  type: CollectionItemTypeValues;
  onClose?: (role?: string, data?: string) => void;
  trigger?: string;
};

const QuickUngroupButton = ({
  id,
  type,
  onClose,
  trigger
}: QuickUngroupButtonProps) => {
  const { t } = useLingui();
  if (type !== CollectionItemType.folder) return <></>;
  if (!trigger) trigger = `${id}-ungroup-btn`;
  return (
    <>
      <IonButton fill="clear" id={trigger}>
        <IonIcon icon={APPICONS.ungroupAction}></IonIcon>
      </IonButton>
      <AreYouSureAlert
        trigger={trigger}
        message={t`This will delete this folder and move all its items to the current one.`}
        onClose={confirmed => {
          if (confirmed) {
            collectionService.deleteItem(id, { moveItemsUp: true });
          }
          if (onClose) onClose(confirmed ? 'ungroup' : 'cancel');
        }}
      />
    </>
  );
};
export default QuickUngroupButton;
